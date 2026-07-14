import { and, eq, sql } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";

const cl = schema.carListings;

/**
 * Real per-model aggregates that make each make/model hub's copy (intro + FAQ)
 * genuinely differ from every other hub's — price band, year range, source-country
 * split, buy-now availability. This is the honest alternative to name-injection:
 * variation comes from the DATA (a Camry and a Civic carry different numbers and a
 * Korean-sourced model skews to a different country), so the pages survive
 * near-duplicate detection AND actually inform the user. See the hub page for how
 * the copy is built from these.
 *
 * All over the ACTIVE catalog only (car_listings), price-positive rows for the
 * money stats, so the numbers match what the visitor sees in the grid. A single
 * round-trip (one aggregate row + a small country breakdown). Not app-cached — a
 * cheap indexed scan over one make/model's slice (the same (manufacturer_id,
 * model_id) predicate the catalog already uses), read per request like the other
 * catalog queries. Fails closed to null so the hub still renders without stats.
 */

export type ModelHubStats = {
  /** Total active listings for this make/model (price-positive). */
  count: number;
  /** Oldest / newest model year present (null if no valid years). */
  yearMin: number | null;
  yearMax: number | null;
  /** Price band in USD: lowest, median, highest effective price. */
  priceMin: number | null;
  priceMedian: number | null;
  priceMax: number | null;
  /** How many are buy-now (fixed price) vs pure auction. */
  buyNowCount: number;
  /** Dominant source country as a BG label ("САЩ"/"Корея"/"Канада"), or null. */
  topCountryLabel: string | null;
  /** Share (0–1) of listings from that dominant country. */
  topCountryShare: number | null;
};

/** location_country → BG market label (matches the catalog filter bar's markets). */
const COUNTRY_LABEL: Record<string, string> = { USA: "САЩ", Canada: "Канада", kr: "Корея" };

export async function getModelHubStats(brandId: number, modelId: number): Promise<ModelHubStats | null> {
  try {
    const db = getDb();
    const where = and(eq(cl.manufacturerId, brandId), eq(cl.modelId, modelId), sql`${cl.effectivePrice} > 0`);

    const [aggRows, countryRows] = await Promise.all([
      db
        .select({
          count: sql<number>`count(*)::int`,
          yearMin: sql<number | null>`min(${cl.carYear}) filter (where ${cl.carYear} between 1980 and 2027)::int`,
          yearMax: sql<number | null>`max(${cl.carYear}) filter (where ${cl.carYear} between 1980 and 2027)::int`,
          priceMin: sql<number | null>`round(min(${cl.effectivePrice}))::int`,
          priceMedian: sql<number | null>`round(percentile_cont(0.5) within group (order by ${cl.effectivePrice}))::int`,
          priceMax: sql<number | null>`round(max(${cl.effectivePrice}))::int`,
          buyNowCount: sql<number>`count(*) filter (where ${cl.buyNow} = true)::int`,
        })
        .from(cl)
        .where(where),
      db
        .select({ country: cl.locationCountry, n: sql<number>`count(*)::int` })
        .from(cl)
        .where(where)
        .groupBy(cl.locationCountry)
        .orderBy(sql`count(*) desc`)
        .limit(1),
    ]);

    const agg = aggRows[0];
    if (!agg || agg.count === 0) return null;

    const top = countryRows[0];
    const topCountryLabel = top?.country ? (COUNTRY_LABEL[top.country] ?? null) : null;
    const topCountryShare = top && agg.count > 0 ? top.n / agg.count : null;

    return {
      count: agg.count,
      yearMin: agg.yearMin,
      yearMax: agg.yearMax,
      priceMin: agg.priceMin,
      priceMedian: agg.priceMedian,
      priceMax: agg.priceMax,
      buyNowCount: agg.buyNowCount,
      topCountryLabel,
      topCountryShare,
    };
  } catch (error) {
    console.error("[get-model-hub-stats] query failed, returning null", error);
    return null;
  }
}
