import { cacheTag } from "next/cache";
import { and, desc, isNotNull, ne, or, sql } from "drizzle-orm";
import { FALLBACK_AUCTION_CARS } from "@/data/home";
import { CACHE_TAGS } from "@/lib/cache-tags";
import { carListingToView } from "@/lib/car-mapper";
import { getDb, schema } from "@/lib/db";
import type { CarView } from "@/types/car.type";

const DEFAULT_LIMIT = 6;

/**
 * Auction car listings for the homepage: active auction listings (i.e. not a
 * valid buy-now) that have an image — like the live site, auction cards without
 * a photo are skipped rather than shown with a placeholder.
 *
 * Reads the `car_listings` projection (one row per physical car, already
 * active-only and pre-joined — see ALL-CARS-DB-DESIGN.md) the same way the
 * all-cars catalog does: zero joins, keyset order on `sort_id DESC` (indexed).
 * Querying raw `auction_lots` here used to `ORDER BY sale_date` (unindexed) and
 * statement-timeout under load — the projection makes this a flat, fast read.
 *
 * Cached via `"use cache"` + `cacheTag` (requires `cacheComponents`, enabled in
 * next.config.ts). Invalidate on write with `revalidateTag(CACHE_TAGS.auctionCars,
 * "max")` when listings change.
 *
 * Falls back to `FALLBACK_AUCTION_CARS` (already photo-filtered) when the DB
 * returns nothing or is unreachable.
 */
export async function getAuctionCars(limit = DEFAULT_LIMIT): Promise<CarView[]> {
  "use cache";
  cacheTag(CACHE_TAGS.auctionCars);

  const cl = schema.carListings;

  try {
    const rows = await getDb()
      .select()
      .from(cl)
      .where(
        and(
          // Auction listing = NOT a valid buy-now: buy_now false/null, or no
          // positive price. Mirrors the catalog's "auction" channel predicate.
          or(ne(cl.buyNow, true), sql`${cl.buyNow} IS NULL`, sql`${cl.effectivePrice} IS NULL`),
          isNotNull(cl.imageUrl),
        ),
      )
      .orderBy(desc(cl.sortId))
      .limit(limit);

    if (rows.length === 0) return FALLBACK_AUCTION_CARS;
    return rows.map((row) => carListingToView(row));
  } catch (error) {
    console.error("[get-auction-cars] query failed, using fallback", error);
    return FALLBACK_AUCTION_CARS;
  }
}
