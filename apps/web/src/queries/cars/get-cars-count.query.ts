import { cacheLife, cacheTag } from "next/cache";
import { and, eq, gte, lte, ne, or, sql } from "drizzle-orm";
import { CACHE_TAGS } from "@/lib/cache-tags";
import { getDb, schema } from "@/lib/db";
import type { CarFilters } from "@/types/car-filters.type";

const cl = schema.carListings;

/** Above this, we report "1000+" instead of an exact count (broad-filter COUNT is
 *  the one slow query — see DB-design §6). The grid header reads "Намерени: N". */
const COUNT_CAP = 1000;

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

/** Result of a capped count: the number, and whether it was capped ("N+"). */
export type CarsCount = { count: number; capped: boolean };

/**
 * Count of cars matching the filters, capped at COUNT_CAP for display. We count
 * up to CAP+1 rows via a subquery `LIMIT` so a broad filter doesn't scan the
 * whole 935k table — exact below the cap, "1000+" above it. Cached by filters.
 */
export async function getCarsCount(filters: CarFilters): Promise<CarsCount> {
  "use cache";
  cacheTag(CACHE_TAGS.cars);
  cacheLife("hours");

  const db = getDb();

  // Search results are small + shown as a list; report their exact count.
  if (filters.search && filters.search.trim() !== "") {
    return { count: 0, capped: false }; // header hidden for search; placeholder
  }

  const t = tableFor(filters);
  const conds = buildConditions(filters, t);
  const capped = db
    .select({ one: sql<number>`1` })
    .from(t)
    .where(conds.length > 0 ? and(...conds) : undefined)
    .limit(COUNT_CAP + 1)
    .as("capped");

  const rows = await db.select({ n: sql<number>`count(*)::int` }).from(capped);
  const n = rows[0]?.n ?? 0;
  return n > COUNT_CAP ? { count: COUNT_CAP, capped: true } : { count: n, capped: false };
}
