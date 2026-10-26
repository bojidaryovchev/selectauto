import { type CalcConfig, DEFAULT_CALC_CONFIG } from "@/data/import-rates";
import { CACHE_TAGS } from "@/lib/cache-tags";
import { getDb, schema } from "@/lib/db";
import { desc } from "drizzle-orm";
import { cacheLife, cacheTag } from "next/cache";

/**
 * The active calculator config (newest `calculator_settings` row), read by the
 * server recompute AND the client via /api/calc-config. Merged over
 * `DEFAULT_CALC_CONFIG` so a stored config missing a newly-added field still gets
 * a sane value. Falls back to the defaults when the table is empty / unreachable.
 *
 * Cached (`"use cache"` + tag `calcConfig`, expired on save) with a long
 * `cacheLife("days")` — it changes only when the admin saves. The unreachable
 * case is kept for minutes only: the defaults are a stand-in, and a day of them
 * would quote the old fees and put mobile.bg adverts at a 0 % markup.
 */
export async function getCalcConfig(): Promise<CalcConfig> {
  "use cache";
  cacheTag(CACHE_TAGS.calcConfig);

  try {
    const rows = await getDb()
      .select({ config: schema.calculatorSettings.config })
      .from(schema.calculatorSettings)
      .orderBy(desc(schema.calculatorSettings.id))
      .limit(1);
    cacheLife("days");
    const stored = rows[0]?.config as Partial<CalcConfig> | undefined;
    if (!stored) return DEFAULT_CALC_CONFIG;
    return { ...DEFAULT_CALC_CONFIG, ...stored };
  } catch (error) {
    console.error("[get-calc-config] query failed, using defaults", error);
    cacheLife("minutes");
    return DEFAULT_CALC_CONFIG;
  }
}
