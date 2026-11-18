import { cacheLife, cacheTag } from "next/cache";
import { and, desc, eq, isNotNull, sql } from "drizzle-orm";
import { FALLBACK_BUY_NOW_CARS } from "@/data/home";
import { CACHE_TAGS } from "@/lib/cache-tags";
import { carListingToView } from "@/lib/car-mapper";
import { getDb, schema } from "@/lib/db";
import type { CarView } from "@/types/car.type";
import { getMakeIndex } from "./get-make-index.query";
import { passengerCarsOnly } from "./passenger-cars";

const DEFAULT_LIMIT = 6;

/** The two sources the rail alternates, Copart first (owner decision 14). */
const RAIL_SOURCES = ["copart_com", "encar_com"] as const;

/** [a0, b0, a1, b1, …]; once one list runs out, the rest of the other follows. */
function interleave<T>(a: T[], b: T[]): T[] {
  const out: T[] = [];
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    if (i < a.length) out.push(a[i]);
    if (i < b.length) out.push(b[i]);
  }
  return out;
}

/**
 * Buy-now car listings for the homepage: active buy-now passenger cars with an
 * image, newest first, Copart and Encar alternating (owner decision 14, 2
 * November 2026: passenger cars only, and the rail mixes the two sources —
 * newest-first alone shows whichever source synced last, and on 2 November that
 * was Copart only). Each source is read separately, newest first, and the rail
 * takes them in turns; a source that runs short is filled from the other.
 *
 * Reads the `car_listings` projection (one row per physical car, already
 * active-only and pre-joined — see docs/05-projection-tables-car-listings.md) the same way the catalog
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
    // Two index scans on `cl_buynow_sort`, ~0.1 ms each (EXPLAIN ANALYZE, 18.11.2026).
    const [first, second] = await Promise.all(
      RAIL_SOURCES.map((domain) =>
        getDb()
          .select()
          .from(cl)
          .where(
            and(
              // Valid buy-now: buy_now flag set with a positive price (mirrors the
              // catalog's "buy-now" channel predicate).
              eq(cl.buyNow, true),
              sql`${cl.effectivePrice} > 0`,
              isNotNull(cl.imageUrl),
              passengerCarsOnly(),
              eq(cl.domainName, domain),
            ),
          )
          .orderBy(desc(cl.sortId))
          .limit(limit),
      ),
    );
    const rows = interleave(first, second).slice(0, limit);

    if (rows.length === 0) return FALLBACK_BUY_NOW_CARS;
    const makes = await getMakeIndex();
    return rows.map((row) => carListingToView(row, false, makes));
  } catch (error) {
    console.error("[get-buy-now-cars] query failed, using fallback", error);
    return FALLBACK_BUY_NOW_CARS;
  }
}
