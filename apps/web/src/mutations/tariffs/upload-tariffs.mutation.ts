"use server";

import { sql } from "drizzle-orm";
import { revalidateTag } from "next/cache";
import { getAdminSession } from "@/lib/admin";
import { CACHE_TAGS } from "@/lib/cache-tags";
import { getDb, schema } from "@/lib/db";
import { parseTariffText } from "@/lib/tariff-parse";
import type { ActionResult } from "@/types/action-result.type";

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
 * /api/us-tariffs, and the server recompute) immediately reads the new version.
 *
 * Safety: the new version is inserted, its rows written, and only THEN made active
 * in a single atomic statement (`active = (id = newId)`), so the previous version
 * stays live until the new one is fully written — a mid-flow failure never leaves
 * the calculator without tariffs. Parsing/validation errors abort before any write
 * and surface the BG message to the admin.
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
    const db = getDb();

    // 1) Insert the version (inactive), get its id.
    const [upload] = await db
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
    const uploadId = upload!.id;

    // 2) Write the rows.
    await db.insert(schema.usInlandTariffs).values(
      parsed.data.inland.map((r) => ({
        uploadId,
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
        .map(([terminal, price]) => ({ uploadId, config, terminal, price: price as number })),
    );
    await db.insert(schema.usContainerPrices).values(containerValues);

    // 3) Activate atomically — exactly this version becomes active.
    await db.execute(sql`UPDATE tariff_uploads SET active = (id = ${uploadId})`);

    revalidateTag(CACHE_TAGS.usTariffs, "max");

    return {
      success: true,
      data: { uploadId, inlandRows: parsed.inlandRows, containerRows: parsed.containerRows },
    };
  } catch (error) {
    console.error("[upload-tariffs] persist failed", error);
    return { success: false, error: "Възникна грешка при запис в базата. Моля опитайте отново." };
  }
}
