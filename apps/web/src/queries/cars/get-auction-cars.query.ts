import { cacheTag } from "next/cache";
import { and, asc, eq, isNotNull, isNull, or } from "drizzle-orm";
import { FALLBACK_AUCTION_CARS } from "@/data/home";
import { CACHE_TAGS } from "@/lib/cache-tags";
import { getDb, schema } from "@/lib/db";
import { toCarView, type LotWithCar } from "@/lib/car-mapper";
import type { CarView } from "@/types/car.type";

const DEFAULT_LIMIT = 6;

/**
 * Auction car listings for the homepage: active, non-archived auction lots
 * (i.e. not buy-now) that have an image — like the live site, auction cards
 * without a photo are skipped rather than shown with a placeholder. Ordered by
 * the soonest sale date and joined to their car for the title/engine.
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

  try {
    const rows = await getDb()
      .select({
        lot: {
          id: schema.auctionLots.id,
          lotNumber: schema.auctionLots.lotNumber,
          domainName: schema.auctionLots.domainName,
          buyNow: schema.auctionLots.buyNow,
          buyNowPrice: schema.auctionLots.buyNowPrice,
          bidPrice: schema.auctionLots.bidPrice,
          finalBid: schema.auctionLots.finalBid,
          odometerKm: schema.auctionLots.odometerKm,
          imageUrl: schema.auctionLots.imageUrl,
          saleDate: schema.auctionLots.saleDate,
        },
        car: {
          title: schema.cars.title,
          year: schema.cars.year,
          engine: schema.cars.engine,
        },
      })
      .from(schema.auctionLots)
      .leftJoin(schema.cars, eq(schema.auctionLots.carId, schema.cars.id))
      .where(
        and(
          // Auction lots: buy_now is false OR null (exclude only explicit true).
          // `ne(buyNow, true)` alone would drop NULL rows in SQL, so OR in IS NULL.
          or(
            eq(schema.auctionLots.buyNow, false),
            isNull(schema.auctionLots.buyNow),
          ),
          eq(schema.auctionLots.archived, false),
          isNotNull(schema.auctionLots.imageUrl),
        ),
      )
      .orderBy(asc(schema.auctionLots.saleDate))
      .limit(limit);

    if (rows.length === 0) return FALLBACK_AUCTION_CARS;
    return (rows as LotWithCar[]).map(toCarView);
  } catch (error) {
    console.error("[get-auction-cars] query failed, using fallback", error);
    return FALLBACK_AUCTION_CARS;
  }
}
