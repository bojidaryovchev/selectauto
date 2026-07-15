/**
 * The single source of truth for turning `CarFilters` into a Drizzle WHERE over a
 * `car_listings` / `car_listings_archived` projection row. Every predicate is one
 * projection column (zero joins) — see docs/05-projection-tables-car-listings.md §5.
 *
 * This used to live (identically) inside get-cars-page and get-cars-count, whose
 * comments warned the two copies MUST stay in lockstep (the count has to match the
 * grid). It now lives here so the listing feed, the "Намерени: N" count, AND the
 * live facet counts (get-car-facets) all share ONE predicate builder — change the
 * filter semantics once, everywhere stays consistent.
 */
import { and, eq, gte, inArray, lte, ne, or, sql } from "drizzle-orm";
import { schema } from "@/lib/db";
import type { CarFilters } from "@/types/car-filters.type";

/**
 * The read model to query: the active catalog or the past/sold archive. Both
 * tables share an identical column shape, so the conditions + mapper work for
 * either. `status === "past"` → car_listings_archived ("Приключили" view).
 *
 * Typed as the union of both tables; Drizzle table types are nominal (the table
 * name is part of the type), so a plain `typeof carListings` would reject the
 * archived table even though the columns match.
 */
export type ListingTable = typeof schema.carListings | typeof schema.carListingsArchived;

const cl = schema.carListings;

export function tableFor(filters: CarFilters): ListingTable {
  return filters.status === "past" ? schema.carListingsArchived : schema.carListings;
}

/**
 * Build the Drizzle WHERE conditions from CarFilters. Every predicate is a single
 * `car_listings` column (zero joins) — see docs/05-projection-tables-car-listings.md §5. `channel`
 * and `market` come from the page-level tabs; the rest from the filter bar.
 *
 * Columns are referenced via `t` (the active OR archived table — identical shape)
 * so the same predicates apply to both read models.
 */
export function buildListingConditions(filters: CarFilters, t: ListingTable = cl) {
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

  // Auction-timing window (active view only — the archived table's dates are all
  // in the past). Every window implies sale_date > now() (so the 84% null-date and
  // stale-past-date active lots drop out, by design); the named windows add an
  // upper bound. Ordered by sort_id DESC as usual — see docs/08-web-all-cars-page.md §3.
  if (filters.status !== "past" && filters.auctionWindow) {
    conds.push(sql`${t.saleDate} > now()`);
    if (filters.auctionWindow === "today")
      // "Днес" = up to the end of the current US-Eastern auction day. The only
      // dated lots are US/CA Copart+IAAI (verified: Encar/KR has zero sale_dates),
      // so the auction day is a US clock — anchor the boundary to America/New_York,
      // not UTC/Sofia, so it aligns with the real sale sessions. Legitimately empty
      // on evenings/weekends (no more US auctions today).
      conds.push(sql`${t.saleDate} < date_trunc('day', now() AT TIME ZONE 'America/New_York') AT TIME ZONE 'America/New_York' + interval '1 day'`);
    else if (filters.auctionWindow === "24h") conds.push(sql`${t.saleDate} <= now() + interval '24 hours'`);
    else if (filters.auctionWindow === "3d") conds.push(sql`${t.saleDate} <= now() + interval '3 days'`);
    else if (filters.auctionWindow === "7d") conds.push(sql`${t.saleDate} <= now() + interval '7 days'`);
    // "scheduled" → lower bound only (already pushed above).
  }

  if (filters.brand !== undefined) conds.push(eq(t.manufacturerId, filters.brand));
  if (filters.model !== undefined) conds.push(eq(t.modelId, filters.model));
  if (filters.color) conds.push(eq(t.carColor, filters.color));
  if (filters.drive) conds.push(eq(t.driveWheel, filters.drive));
  if (filters.fuel) conds.push(eq(t.fuelType, filters.fuel));
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
