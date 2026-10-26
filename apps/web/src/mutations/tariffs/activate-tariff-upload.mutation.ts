"use server";

import { getAdminSession } from "@/lib/admin";
import { CACHE_TAGS } from "@/lib/cache-tags";
import { getDb, schema } from "@/lib/db";
import type { ActionResult } from "@/types/action-result.type";
import { count, eq, sql } from "drizzle-orm";
import { updateTag } from "next/cache";

/**
 * Admin-only: make an earlier tariff version active again, or — `uploadId` null —
 * go back to the built-in table (no version active). The undo for a paste that
 * turned out wrong: before this, the only way back was pasting the old table
 * again. Exactly one version stays active (the same `active = (id = …)` statement
 * the upload uses), and the calculator reads it from the next request on.
 *
 * A version whose stored rows don't match its recorded counts is refused: it was
 * never fully written (uploads made before they ran in one transaction could be).
 */
export async function activateTariffUpload(uploadId: number | null): Promise<ActionResult> {
  if (!(await getAdminSession())) return { success: false, error: "Нямате достъп до тази операция." };
  if (uploadId !== null && !(Number.isInteger(uploadId) && uploadId > 0)) {
    return { success: false, error: "Невалидна версия." };
  }

  try {
    const db = getDb();
    if (uploadId === null) {
      await db.update(schema.tariffUploads).set({ active: false }).where(eq(schema.tariffUploads.active, true));
    } else {
      const [upload] = await db
        .select({ inlandRows: schema.tariffUploads.inlandRows, containerRows: schema.tariffUploads.containerRows })
        .from(schema.tariffUploads)
        .where(eq(schema.tariffUploads.id, uploadId))
        .limit(1);
      if (!upload) return { success: false, error: "Версията не е намерена." };

      const [[inland], [container]] = await Promise.all([
        db.select({ n: count() }).from(schema.usInlandTariffs).where(eq(schema.usInlandTariffs.uploadId, uploadId)),
        db.select({ n: count() }).from(schema.usContainerPrices).where(eq(schema.usContainerPrices.uploadId, uploadId)),
      ]);
      if (inland?.n !== upload.inlandRows || container?.n !== upload.containerRows) {
        return { success: false, error: "Тази версия не е записана изцяло и не може да бъде активирана." };
      }

      await db.execute(sql`UPDATE tariff_uploads SET active = (id = ${uploadId})`);
    }

    updateTag(CACHE_TAGS.usTariffs);
    return { success: true, data: undefined };
  } catch (error) {
    console.error("[activate-tariff-upload] failed", error);
    return { success: false, error: "Възникна грешка при запис. Моля опитайте отново." };
  }
}
