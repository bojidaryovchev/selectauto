import { cacheLife, cacheTag } from "next/cache";
import { and, eq, gte, inArray, lte, ne, or, sql } from "drizzle-orm";
import { CACHE_TAGS } from "@/lib/cache-tags";
import { getDb, schema } from "@/lib/db";
import type { CarFilters } from "@/types/car-filters.type";

const cl = schema.carListings;

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
  "use cache";
  cacheTag(CACHE_TAGS.cars);
  cacheLife("hours");

  const db = getDb();

  // Search results are shown as a list; the header is hidden for search.
  if (filters.search && filters.search.trim() !== "") {
    return { count: 0 };
  }

  const t = tableFor(filters);
  const conds = buildConditions(filters, t);
  const rows = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(t)
    .where(conds.length > 0 ? and(...conds) : undefined);
  return { count: rows[0]?.n ?? 0 };
}
