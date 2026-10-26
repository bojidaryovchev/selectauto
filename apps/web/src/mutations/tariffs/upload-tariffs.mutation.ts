"use server";

import { getAdminSession } from "@/lib/admin";
import { CACHE_TAGS } from "@/lib/cache-tags";
import { getDb, schema } from "@/lib/db";
import { parseTariffText } from "@/lib/tariff-parse";
import type { ActionResult } from "@/types/action-result.type";
import { sql } from "drizzle-orm";
import { updateTag } from "next/cache";

export type UploadTariffsResult = {
  uploadId: number;
  inlandRows: number;
  containerRows: number;
};

export type UploadTariffsInput = {
  inlandTsv: string;
  containerTsv: string;
  note?: string;
};

/**
 * Admin-only: parse the pasted inland + container tables (TSV), validate them,
 * store them as a new tariff version, and activate it. The calculator (client via
 * /api/us-tariffs, and the server recompute) reads the new version from the next
 * request on (`updateTag`: no stale copy is served while it refreshes).
 *
 * Safety: the version, its rows and the switch (`active = (id = newId)`, so
 * exactly one version is active) are one transaction — the previous version
 * stays live until the new one is complete, and a failure leaves nothing behind
 * (no half-written version that could later be re-activated). Parsing/validation
 * errors abort before any write and surface the BG message to the admin. The
 * admin page checks a paste against the active table first (checkTariffsAction).
 */
export async function uploadTariffs(input: UploadTariffsInput): Promise<ActionResult<UploadTariffsResult>> {
  const session = await getAdminSession();
  if (!session) return { success: false, error: "Нямате достъп до тази операция." };

  const inlandTsv = input?.inlandTsv ?? "";
  const containerTsv = input?.containerTsv ?? "";
  const note = input?.note?.trim() || null;

  if (!inlandTsv.trim() || !containerTsv.trim()) {
    return { success: false, error: "Поставете и двете таблици — транспортна и контейнерна." };
  }

  // Parse + validate (throws a BG message on any shape/data problem).
  let parsed;
  try {
    parsed = parseTariffText({ inlandTsv, containerTsv });
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Неуспешно разчитане на поставените данни.",
    };
  }

  const filename = note ?? `Поставени тарифи (${parsed.inlandRows} реда)`;

  try {
    const uploadId = await getDb().transaction(async (tx) => {
      // 1) The version (inactive until its rows are in).
      const [upload] = await tx
        .insert(schema.tariffUploads)
        .values({
          filename,
          inlandRows: parsed.inlandRows,
          containerRows: parsed.containerRows,
          note,
          active: false,
          uploadedBy: session.user?.id ?? null,
        })
        .returning({ id: schema.tariffUploads.id });
      const id = upload!.id;

      // 2) Its rows.
      await tx.insert(schema.usInlandTariffs).values(
        parsed.data.inland.map((r) => ({
          uploadId: id,
          location: r.location,
          auction: r.auction,
          city: r.city || null,
          state: r.state || null,
          zip: r.zip || null,
          terminal: r.terminal,
          inland: r.inland,
        })),
      );

      const containerValues = Object.entries(parsed.data.container).flatMap(([config, byTerminal]) =>
        Object.entries(byTerminal)
          .filter(([, price]) => price !== undefined)
          .map(([terminal, price]) => ({ uploadId: id, config, terminal, price: price as number })),
      );
      await tx.insert(schema.usContainerPrices).values(containerValues);

      // 3) Exactly this version becomes active.
      await tx.execute(sql`UPDATE tariff_uploads SET active = (id = ${id})`);
      return id;
    });

    updateTag(CACHE_TAGS.usTariffs);

    return {
      success: true,
      data: { uploadId, inlandRows: parsed.inlandRows, containerRows: parsed.containerRows },
    };
  } catch (error) {
    console.error("[upload-tariffs] persist failed", error);
    return { success: false, error: "Възникна грешка при запис в базата. Моля опитайте отново." };
  }
}
