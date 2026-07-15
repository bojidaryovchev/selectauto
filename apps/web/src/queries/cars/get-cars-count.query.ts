import { and, eq, sql } from "drizzle-orm";
import { buildListingConditions, tableFor } from "@/lib/car-listing-conditions";
import { getDb, schema } from "@/lib/db";
import type { CarFilters } from "@/types/car-filters.type";

const clc = schema.carListingCounts;

/**
 * Resolve the BROAD count for a filter set from the car_listing_counts summary
 * table (migration 0016) — an O(1) PK lookup instead of a full-table COUNT(*)
 * (~750k-row seq scan, the cause of the slow "Намерени автомобили" on big
 * markets). Returns null when the filter set is NOT purely a broad page-tab combo
 * (i.e. any narrow dropdown/range filter is set), in which case the caller falls
 * back to a live COUNT — those filtered sets are small enough to scan quickly.
 *
 * "Broad" = only status (active/past), market, and channel may be set. The
 * (dim, val) key MUST match how listing_count_keys() bucketed each row:
 *   none        → ('total','')
 *   market only → ('country', <USA|kr|Canada>)
 *   channel only→ ('channel', <buy-now|auction>)
 *   both        → ('country+channel', '<country>|<channel>')
 */
async function getBroadCount(filters: CarFilters): Promise<number | null> {
  // Any narrow filter present → not a broad combo; caller does a live COUNT.
  const hasNarrow =
    // Auction window is a sale_date range with no precomputed bucket in the
    // summary table → treat as narrow so the live COUNT path handles it (fast
    // over the ≤13.5% future-dated subset).
    filters.auctionWindow !== undefined ||
    filters.brand !== undefined ||
    filters.model !== undefined ||
    filters.color !== undefined ||
    filters.drive !== undefined ||
    filters.fuel !== undefined ||
    filters.condition !== undefined ||
    filters.type !== undefined ||
    filters.yearFrom !== undefined ||
    filters.yearTo !== undefined ||
    filters.priceMin !== undefined ||
    filters.priceMax !== undefined;
  if (hasNarrow) return null;

  const tableKind = filters.status === "past" ? "past" : "active";

  // Map market → the location_country value the counter stores (same as the
  // page query's predicate: us→USA, kr→kr, ca→Canada).
  const country =
    filters.market === "us" ? "USA" : filters.market === "kr" ? "kr" : filters.market === "ca" ? "Canada" : undefined;
  const channel = filters.channel === "buy-now" ? "buy-now" : filters.channel === "auction" ? "auction" : undefined;

  let dim: string;
  let val: string;
  if (country && channel) {
    dim = "country+channel";
    val = `${country}|${channel}`;
  } else if (country) {
    dim = "country";
    val = country;
  } else if (channel) {
    dim = "channel";
    val = channel;
  } else {
    dim = "total";
    val = "";
  }

  const rows = await getDb()
    .select({ n: clc.n })
    .from(clc)
    .where(and(eq(clc.tableKind, tableKind), eq(clc.dim, dim), eq(clc.val, val)))
    .limit(1);

  // A key with count 0 legitimately may not have a row; treat missing as 0.
  return rows[0]?.n ?? 0;
}

/** The exact number of cars matching the filters. */
export type CarsCount = { count: number };

/**
 * **Exact** count of cars matching the filters — we show the true number
 * ("Намерени: 12 743"), not a "1000+" cap.
 *
 * Broad page-tab views (market × channel × active/past) read the precomputed
 * `car_listing_counts` summary table — an O(1) PK lookup (~35ms), avoiding the
 * full-table `COUNT(*)` seq scan that an unbounded count over ~750k+ rows incurs
 * (see migration 0016 + `getBroadCount`). Narrow filters (brand/model/year/price/…)
 * fall back to a live single-table `COUNT(*)`; those filtered sets are small enough
 * to scan quickly. Not app-cached — reads Neon directly each request.
 */
export async function getCarsCount(filters: CarFilters): Promise<CarsCount> {
  const db = getDb();

  // Search results are shown as a list; the header is hidden for search.
  if (filters.search && filters.search.trim() !== "") {
    return { count: 0 };
  }

  // Broad page-tab views (market × channel × active/past) → O(1) summary-table
  // lookup, avoiding the ~750k-row COUNT(*) seq scan. Narrow filters fall through.
  const broad = await getBroadCount(filters);
  if (broad !== null) return { count: broad };

  const t = tableFor(filters);
  const conds = buildListingConditions(filters, t);
  const rows = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(t)
    .where(conds.length > 0 ? and(...conds) : undefined);
  return { count: rows[0]?.n ?? 0 };
}
