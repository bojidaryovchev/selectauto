import { cacheTag } from "next/cache";
import { and, desc, eq, isNotNull, sql } from "drizzle-orm";
import { FALLBACK_BUY_NOW_CARS } from "@/data/home";
import { CACHE_TAGS } from "@/lib/cache-tags";
import { carListingToView } from "@/lib/car-mapper";
import { getDb, schema } from "@/lib/db";
import type { CarView } from "@/types/car.type";

const DEFAULT_LIMIT = 6;

/**
 * Buy-now car listings for the homepage: active buy-now cars with an image,
 * newest first.
 *
 * Reads the `car_listings` projection (one row per physical car, already
 * active-only and pre-joined — see ALL-CARS-DB-DESIGN.md) the same way the catalog
 * + `getAuctionCars` do: zero joins, keyset order on `sort_id DESC` (indexed via
 * `cl_buynow_sort`). The previous version scanned raw `auction_lots` and
 * `ORDER BY sale_date` (unindexed) — ~3.4s on the 1M-row table, which
 * statement-timeout'd and hard-failed the production prerender. The projection
 * read is ~280ms.
 *
 * Cached via `"use cache: remote"` + `cacheTag` (requires `cacheComponents`,
 * enabled in next.config.ts). Remote (shared) cache, not in-memory: on Vercel the
 * default in-memory `"use cache"` is per-instance and discarded between serverless
 * invocations, so it never hit across requests/users; the remote handler persists
 * the entry across all instances. Invalidate on write with
 * `revalidateTag(CACHE_TAGS.buyNowCars, "max")` when listings change.
 *
 * Falls back to `FALLBACK_BUY_NOW_CARS` when the DB returns nothing or is
 * unreachable, so the homepage always renders.
 */
export async function getBuyNowCars(limit = DEFAULT_LIMIT): Promise<CarView[]> {
  "use cache: remote";
  cacheTag(CACHE_TAGS.buyNowCars);

  const cl = schema.carListings;

  try {
    const rows = await getDb()
      .select()
      .from(cl)
      .where(
        and(
          // Valid buy-now: buy_now flag set with a positive price (mirrors the
          // catalog's "buy-now" channel predicate).
          eq(cl.buyNow, true),
          sql`${cl.effectivePrice} > 0`,
          isNotNull(cl.imageUrl),
        ),
      )
      .orderBy(desc(cl.sortId))
      .limit(limit);

    if (rows.length === 0) return FALLBACK_BUY_NOW_CARS;
    return rows.map((row) => carListingToView(row));
  } catch (error) {
    console.error("[get-buy-now-cars] query failed, using fallback", error);
    return FALLBACK_BUY_NOW_CARS;
  }
}
