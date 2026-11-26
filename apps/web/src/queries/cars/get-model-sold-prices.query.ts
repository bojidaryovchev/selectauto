import { cacheLife, cacheTag } from "next/cache";
import { and, desc, eq, gte } from "drizzle-orm";
import { CACHE_TAGS } from "@/lib/cache-tags";
import { getDb, schema } from "@/lib/db";

const sps = schema.soldPriceStats;

/**
 * Real, per-year AVERAGE SOLD prices for a make/model, from our own archive of
 * concluded lots. This is the honest, dependency-free equivalent of AuctionsAPI's
 * `/statistics` endpoint: we already store the realized sale price
 * (`effective_price` = "Продаден за") on every archived lot, so the market
 * benchmark comes from our DB with no runtime API call.
 *
 * `effective_price` carries junk low values (placeholder "$25" rows), so the AVERAGE
 * and COUNT are what we surface — a mean over hundreds of sales is robust to a few
 * outliers, whereas a raw min/max would show noise.
 *
 * Both read the precomputed `sold_price_stats` table (migration 0054), rebuilt
 * daily from `car_listings_archived` by /api/cron/refresh-sold-price-stats. They
 * used to aggregate the archive per request (9,445 buffers / 66 ms per car page and
 * 24,959 buffers / 203 ms per hub for a Hyundai Tucson), and because the
 * `"use cache"` below is per-instance memory on serverless they ran on almost
 * every page view — most of the database's reads. Now each is one primary-key
 * read. The numbers are the same ones the old queries computed (same filters:
 * `effective_price > 0`, model years 1990–2027, `round(avg(...))`), at most a day
 * old, which is the freshness the `cacheLife("days")` here always allowed.
 *
 * Both stay `"use cache"` + `cacheLife("days")` (tag `cars`): the args are a small,
 * stable make/model[/year] key and the output is shared across all visitors.
 * Fails closed so callers still render.
 */

export type ModelYearPrice = {
  year: number;
  /** Average realized sale price (USD), rounded. */
  avg: number;
  /** Number of concluded sales behind the average. */
  count: number;
};

/** How many sales a year needs before its average is credible enough to show. */
const MIN_SALES_PER_YEAR = 3;
/** Cap the table to the most recent N qualifying years (keeps it scannable). */
const MAX_YEARS = 16;

/**
 * Per-year sold-price averages for a model, newest year first, only years with a
 * credible sample. Returns [] on any miss (no archive, too few sales, or error) so
 * the hub simply omits the section.
 */
export async function getModelSoldPricesByYear(brandId: number, modelId: number): Promise<ModelYearPrice[]> {
  "use cache";
  cacheTag(CACHE_TAGS.cars);
  cacheLife("days");

  try {
    const rows = await getDb()
      .select({ year: sps.carYear, avg: sps.avgPrice, count: sps.n })
      .from(sps)
      .where(and(eq(sps.manufacturerId, brandId), eq(sps.modelId, modelId), gte(sps.n, MIN_SALES_PER_YEAR)))
      .orderBy(desc(sps.carYear))
      .limit(MAX_YEARS);

    return rows;
  } catch (error) {
    console.error("[get-model-sold-prices] byYear failed, returning []", error);
    return [];
  }
}

/**
 * The single average sold price for one model + year — the benchmark the car-detail
 * page compares a listing against. Same source/caveats as above; null when there
 * aren't enough comparables (or on error) so the detail page shows no benchmark.
 */
export async function getModelYearSoldStat(
  brandId: number,
  modelId: number,
  year: number,
): Promise<{ avg: number; count: number } | null> {
  "use cache";
  cacheTag(CACHE_TAGS.cars);
  cacheLife("days");

  if (!Number.isInteger(year) || year < 1990 || year > 2027) return null;
  try {
    const rows = await getDb()
      .select({ avg: sps.avgPrice, count: sps.n })
      .from(sps)
      .where(and(eq(sps.manufacturerId, brandId), eq(sps.modelId, modelId), eq(sps.carYear, year)))
      .limit(1);
    const r = rows[0];
    if (!r || r.count < MIN_SALES_PER_YEAR) return null;
    return { avg: r.avg, count: r.count };
  } catch (error) {
    console.error("[get-model-sold-prices] yearStat failed, returning null", error);
    return null;
  }
}
