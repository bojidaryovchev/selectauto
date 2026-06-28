import { cacheTag } from "next/cache";
import { and, desc, eq, isNotNull } from "drizzle-orm";
import { FALLBACK_BUY_NOW_CARS } from "@/data/home";
import { CACHE_TAGS } from "@/lib/cache-tags";
import { getDb, schema } from "@/lib/db";
import { toCarView, type LotWithCar } from "@/lib/car-mapper";
import type { CarView } from "@/types/car.type";

const DEFAULT_LIMIT = 6;

/**
 * Buy-now car listings for the homepage: active, non-archived buy-now lots that
 * have an image, newest first, joined to their car for the title/engine.
 *
 * Cached via `"use cache"` + `cacheTag` (requires `cacheComponents`, enabled in
 * next.config.ts). Invalidate on write with `revalidateTag(CACHE_TAGS.buyNowCars,
 * "max")` from the ingestion path / a route handler when listings change.
 *
 * Falls back to `FALLBACK_BUY_NOW_CARS` when the DB returns nothing or is
 * unreachable, so the homepage always renders (mirrors the "swap for live data
 * later" intent of the original static snapshot).
 */
export async function getBuyNowCars(limit = DEFAULT_LIMIT): Promise<CarView[]> {
  "use cache";
  cacheTag(CACHE_TAGS.buyNowCars);

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
          eq(schema.auctionLots.buyNow, true),
          eq(schema.auctionLots.archived, false),
          isNotNull(schema.auctionLots.imageUrl),
        ),
      )
      .orderBy(desc(schema.auctionLots.saleDate))
      .limit(limit);

    if (rows.length === 0) return FALLBACK_BUY_NOW_CARS;
    return (rows as LotWithCar[]).map(toCarView);
  } catch (error) {
    console.error("[get-buy-now-cars] query failed, using fallback", error);
    return FALLBACK_BUY_NOW_CARS;
  }
}
