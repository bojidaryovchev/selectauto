import { cacheLife, cacheTag } from "next/cache";
import { and, eq, gte, inArray, lte, ne, or, sql } from "drizzle-orm";
import { CACHE_TAGS } from "@/lib/cache-tags";
import { getDb, schema } from "@/lib/db";
import type { CarFilters } from "@/types/car-filters.type";

const cl = schema.carListings;
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
    filters.brand !== undefined ||
    filters.model !== undefined ||
    filters.color !== undefined ||
    filters.drive !== undefined ||
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

/** Same WHERE builder as the listing page, minus the keyset cursor. */
type ListingTable = typeof schema.carListings | typeof schema.carListingsArchived;

function tableFor(filters: CarFilters): ListingTable {
  return filters.status === "past" ? schema.carListingsArchived : schema.carListings;
}

function buildConditions(filters: CarFilters, t: ListingTable = cl) {
  const conds = [];
  if (filters.channel === "buy-now") conds.push(and(eq(t.buyNow, true), sql`${t.effectivePrice} > 0`));
  else if (filters.channel === "auction")
    conds.push(or(ne(t.buyNow, true), sql`${t.buyNow} IS NULL`, sql`${t.effectivePrice} IS NULL`));
  if (filters.market === "us") conds.push(eq(t.locationCountry, "USA"));
  else if (filters.market === "kr") conds.push(eq(t.locationCountry, "kr"));
  else if (filters.market === "ca") conds.push(eq(t.locationCountry, "Canada"));
  if (filters.brand !== undefined) conds.push(eq(t.manufacturerId, filters.brand));
  if (filters.model !== undefined) conds.push(eq(t.modelId, filters.model));
  if (filters.color) conds.push(eq(t.carColor, filters.color));
  if (filters.drive) conds.push(eq(t.driveWheel, filters.drive));
  if (filters.condition) {
    // Mirror the page query: the facet value is one or more raws (a BG label can
    // cover several, e.g. run_and_drives,engine_starts), so match the whole set.
    const raws = filters.condition.split(",").filter(Boolean);
    if (raws.length === 1) conds.push(eq(t.condition, raws[0]));
    else if (raws.length > 1) conds.push(inArray(t.condition, raws));
  }
  if (filters.type) {
    const [kind, value] = filters.type.split(":");
    if (kind === "vt" && value) conds.push(eq(t.vehicleType, value));
    else if (kind === "bt" && value) conds.push(eq(t.bodyType, value));
  }
  if (filters.yearFrom !== undefined) conds.push(gte(t.carYear, filters.yearFrom));
  if (filters.yearTo !== undefined) conds.push(lte(t.carYear, filters.yearTo));
  if (filters.priceMin !== undefined) conds.push(gte(t.effectivePrice, String(filters.priceMin)));
  if (filters.priceMax !== undefined) conds.push(lte(t.effectivePrice, String(filters.priceMax)));
  return conds;
}

/** The exact number of cars matching the filters. */
export type CarsCount = { count: number };

/**
 * **Exact** count of cars matching the filters. Single-table `COUNT(*)` over the
 * projection — measured 43–197ms even unfiltered (the `vehicle_type`/`body_type`
 * indexes in migration 0015 + a VACUUM ANALYZE keep the rare-type and archived
 * counts fast). Cached by filters (`cacheLife("hours")`), so repeated combos are
 * instant. We show the true number ("Намерени: 12 743"), not a "1000+" cap.
 */
export async function getCarsCount(filters: CarFilters): Promise<CarsCount> {
  "use cache: remote";
  cacheTag(CACHE_TAGS.cars);
  cacheLife("hours");

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
  const conds = buildConditions(filters, t);
  const rows = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(t)
    .where(conds.length > 0 ? and(...conds) : undefined);
  return { count: rows[0]?.n ?? 0 };
}
