"use server";

import { getAdminSession } from "@/lib/admin";
import { CACHE_TAGS } from "@/lib/cache-tags";
import { getDb, schema } from "@/lib/db";
import { calcConfigSchema } from "@/schemas/calc-config.schema";
import type { ActionResult } from "@/types/action-result.type";
import { updateTag } from "next/cache";

/**
 * Admin-only: save the calculator config (fees/commission/transport/rates). Each
 * save inserts a new `calculator_settings` row (newest = active), so every
 * earlier config is kept. Expires `calcConfig` with `updateTag`, so the
 * calculator (server recompute + client /api/calc-config) and mobile.bg read the
 * new values from the next request on — `revalidateTag(…, "max")` served the old
 * ones once more while refreshing.
 */
export async function updateCalcConfig(input: unknown): Promise<ActionResult> {
  const session = await getAdminSession();
  if (!session) return { success: false, error: "Нямате достъп до тази операция." };

  const parsed = calcConfigSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Невалидни стойности." };
  }

  try {
    await getDb()
      .insert(schema.calculatorSettings)
      .values({ config: parsed.data, updatedBy: session.user?.id ?? null });
    updateTag(CACHE_TAGS.calcConfig);
    return { success: true, data: undefined };
  } catch (error) {
    console.error("[update-calc-config] save failed", error);
    return { success: false, error: "Възникна грешка при запис. Моля опитайте отново." };
  }
}
