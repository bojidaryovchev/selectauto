import { and, eq, sql } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";

const cla = schema.carListingsArchived;

/**
 * Real, per-year AVERAGE SOLD prices for a make/model, computed from our own
 * `car_listings_archived` (the concluded/sold read model). This is the honest,
 * dependency-free equivalent of AuctionsAPI's `/statistics` endpoint: we already
 * store the realized sale price (`effective_price` = "Продаден за") on every archived
 * lot, so the market benchmark comes from our DB with no runtime API call.
 *
 * `effective_price` carries junk low values (placeholder "$25" rows), so the AVERAGE
 * and COUNT are what we surface — a mean over hundreds of sales is robust to a few
 * outliers, whereas a raw min/max would show noise. Cheap: the (manufacturer_id,
 * model_id) predicate hits `cla_brand_model_sort`; a whole model's slice is a small
 * indexed scan (~250ms for the largest models). Fails closed so callers still render.
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
  try {
    const db = getDb();
    const rows = await db
      .select({
        year: sql<number>`${cla.carYear}::int`,
        avg: sql<number>`round(avg(${cla.effectivePrice}))::int`,
        count: sql<number>`count(*)::int`,
      })
      .from(cla)
      .where(
        and(
          eq(cla.manufacturerId, brandId),
          eq(cla.modelId, modelId),
          sql`${cla.effectivePrice} > 0`,
          sql`${cla.carYear} between 1990 and 2027`,
        ),
      )
      .groupBy(cla.carYear)
      .having(sql`count(*) >= ${MIN_SALES_PER_YEAR}`)
      .orderBy(sql`${cla.carYear} desc`)
      .limit(MAX_YEARS);

    return rows.filter((r) => r.year != null && r.avg != null);
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
  if (!Number.isInteger(year) || year < 1990 || year > 2027) return null;
  try {
    const db = getDb();
    const rows = await db
      .select({
        avg: sql<number>`round(avg(${cla.effectivePrice}))::int`,
        count: sql<number>`count(*)::int`,
      })
      .from(cla)
      .where(
        and(
          eq(cla.manufacturerId, brandId),
          eq(cla.modelId, modelId),
          eq(cla.carYear, year),
          sql`${cla.effectivePrice} > 0`,
        ),
      );
    const r = rows[0];
    if (!r || r.count < MIN_SALES_PER_YEAR || r.avg == null) return null;
    return { avg: r.avg, count: r.count };
  } catch (error) {
    console.error("[get-model-sold-prices] yearStat failed, returning null", error);
    return null;
  }
}
