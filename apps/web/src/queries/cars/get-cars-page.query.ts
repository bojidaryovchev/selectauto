import { and, desc, eq, gte, ilike, inArray, lt, lte, ne, or, sql } from "drizzle-orm";
import { carListingToView } from "@/lib/car-mapper";
import { getDb, schema } from "@/lib/db";
import type { CarFilters, CarsPage } from "@/types/car-filters.type";

/** Cars per page in the catalog grid. */
export const CARS_PAGE_SIZE = 24;

/**
 * The read model to query: the active catalog or the past/sold archive. Both
 * tables share an identical column shape, so the conditions + mapper work for
 * either. `status === "past"` → car_listings_archived ("Приключили" view).
 *
 * Typed as the union of both tables; Drizzle table types are nominal (the table
 * name is part of the type), so a plain `typeof carListings` would reject the
 * archived table even though the columns match.
 */
type ListingTable = typeof schema.carListings | typeof schema.carListingsArchived;

function tableFor(filters: CarFilters): ListingTable {
  return filters.status === "past" ? schema.carListingsArchived : schema.carListings;
}

const cl = schema.carListings;

/**
 * Build the Drizzle WHERE conditions from CarFilters. Every predicate is a single
 * `car_listings` column (zero joins) — see ALL-CARS-DB-DESIGN.md §5. `channel`
 * and `market` come from the page-level tabs; the rest from the filter bar.
 *
 * Columns are referenced via `t` (the active OR archived table — identical shape)
 * so the same predicates apply to both read models.
 */
function buildConditions(filters: CarFilters, t: ListingTable = cl) {
  const conds = [];

  if (filters.channel === "buy-now") {
    conds.push(and(eq(t.buyNow, true), sql`${t.effectivePrice} > 0`));
  } else if (filters.channel === "auction") {
    // auction = NOT a valid buy-now (buy_now false/null, or no positive price)
    conds.push(or(ne(t.buyNow, true), sql`${t.buyNow} IS NULL`, sql`${t.effectivePrice} IS NULL`));
  }

  if (filters.market === "us") conds.push(eq(t.locationCountry, "USA"));
  else if (filters.market === "kr") conds.push(eq(t.locationCountry, "kr"));
  else if (filters.market === "ca") conds.push(eq(t.locationCountry, "Canada"));

  if (filters.brand !== undefined) conds.push(eq(t.manufacturerId, filters.brand));
  if (filters.model !== undefined) conds.push(eq(t.modelId, filters.model));
  if (filters.color) conds.push(eq(t.carColor, filters.color));
  if (filters.drive) conds.push(eq(t.driveWheel, filters.drive));
  if (filters.condition) {
    // The condition facet value is one or more raws (a BG label can cover several,
    // e.g. run_and_drives,engine_starts), so match the whole set.
    const raws = filters.condition.split(",").filter(Boolean);
    if (raws.length === 1) conds.push(eq(t.condition, raws[0]));
    else if (raws.length > 1) conds.push(inArray(t.condition, raws));
  }
  if (filters.type) {
    // "vt:<value>" → vehicle_type column; "bt:<value>" → body_type column.
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

/** Decode/encode the opaque keyset cursor (the chosen lot's sort_id). */
function decodeCursor(cursor: string | null): number | null {
  if (!cursor) return null;
  const n = Number(cursor);
  return Number.isInteger(n) ? n : null;
}

/**
 * One page of catalog results for the given filters + cursor.
 *
 * Two query shapes (verified by EXPLAIN — see DB-design §5):
 *  - **Search** (lot number / VIN present): an exact LOOKUP — no keyset, no
 *    sort_id ordering (adding it makes the planner ignore the lot/vin index).
 *  - **Feed** (everything else): keyset pagination on `sort_id DESC`, fetching
 *    PAGE+1 to detect a next page. Flat cost at any depth.
 *
 * Not cached: reads Neon directly per request (keyset feed is flat-cost, so this
 * stays fast). The page passes parsed filters as args rather than reading
 * `searchParams` here.
 */
export async function getCarsPage(filters: CarFilters, cursor: string | null): Promise<CarsPage> {
  const db = getDb();
  const t = tableFor(filters);
  const isPast = filters.status === "past";

  // Search branch: exact lookup, capped, no infinite scroll.
  if (filters.search && filters.search.trim() !== "") {
    const q = filters.search.trim();
    const rows = await db
      .select()
      .from(t)
      .where(or(ilike(t.lotNumber, `${q}%`), eq(t.vin, q.toUpperCase())))
      .limit(CARS_PAGE_SIZE);
    return { cars: rows.map((r) => carListingToView(r, isPast)), nextCursor: null };
  }

  // Feed branch: filtered keyset page.
  const conds = buildConditions(filters, t);
  const cursorId = decodeCursor(cursor);
  if (cursorId !== null) conds.push(lt(t.sortId, cursorId));

  const rows = await db
    .select()
    .from(t)
    .where(conds.length > 0 ? and(...conds) : undefined)
    .orderBy(desc(t.sortId))
    .limit(CARS_PAGE_SIZE + 1);

  const hasMore = rows.length > CARS_PAGE_SIZE;
  const pageRows = hasMore ? rows.slice(0, CARS_PAGE_SIZE) : rows;
  const nextCursor = hasMore ? String(pageRows[pageRows.length - 1].sortId) : null;

  return { cars: pageRows.map((r) => carListingToView(r, isPast)), nextCursor };
}
