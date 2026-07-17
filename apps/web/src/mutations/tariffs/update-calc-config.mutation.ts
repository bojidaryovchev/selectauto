"use server";

import { revalidateTag } from "next/cache";
import { getAdminSession } from "@/lib/admin";
import { CACHE_TAGS } from "@/lib/cache-tags";
import { getDb, schema } from "@/lib/db";
import { calcConfigSchema } from "@/schemas/calc-config.schema";
import type { ActionResult } from "@/types/action-result.type";

/**
 * Admin-only: save the calculator config (fees/commission/transport/rates). Each
 * save inserts a new `calculator_settings` row (newest = active), so there's a
 * history + trivial rollback. Revalidates `calcConfig` so the calculator (server
 * recompute + client /api/calc-config) picks it up immediately.
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
    revalidateTag(CACHE_TAGS.calcConfig, "max");
    return { success: true, data: undefined };
  } catch (error) {
    console.error("[update-calc-config] save failed", error);
    return { success: false, error: "Възникна грешка при запис. Моля опитайте отново." };
  }
}
