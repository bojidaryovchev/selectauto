import { cacheLife, cacheTag } from "next/cache";
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
 * Cached with `"use cache"` + `cacheLife("hours")`: this is one of the few
 * queries worth app-caching — it takes no per-request key (only the numeric
 * `limit`, which becomes part of the cache key), is shared by every homepage
 * visitor, and changes only as fast as the hourly ingestion sync. The directive
 * also lets Next prefetch it into the static shell. It's plain `"use cache"`
 * (in-memory LRU per instance), NOT `"use cache: remote"` — without a configured
 * `cacheHandlers.remote` the two are identical, and naming it "remote" would imply
 * a durable shared store we don't have (that was the prior bug: a "remote"
 * directive silently falling back to ephemeral memory on Vercel). The catalog
 * queries are NOT cached — they're DB-cheap and per-request-unique; see
 * [cache-tags.ts](../../lib/cache-tags.ts). `cacheTag(CACHE_TAGS.buyNowCars)` lets
 * a write/webhook expire it early via `revalidateTag`.
 *
 * Falls back to `FALLBACK_BUY_NOW_CARS` when the DB returns nothing or is
 * unreachable, so the homepage always renders.
 */
export async function getBuyNowCars(limit = DEFAULT_LIMIT): Promise<CarView[]> {
  "use cache";
  cacheTag(CACHE_TAGS.buyNowCars);
  cacheLife("hours");

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
