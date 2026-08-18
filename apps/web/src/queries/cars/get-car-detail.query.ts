import { cache } from "react";
import { cacheLife, cacheTag } from "next/cache";
import { and, eq, sql } from "drizzle-orm";
import { carDetailFromRows } from "@/lib/car-detail-mapper";
import { carListingToView } from "@/lib/car-mapper";
import { CACHE_TAGS, carCacheTag } from "@/lib/cache-tags";
import { getDb, schema } from "@/lib/db";
import { getModelYearSoldStat } from "./get-model-sold-prices.query";
import type { CarDetail, CarDetailPayload } from "@/types/car-detail.type";
import type { CarView } from "@/types/car.type";

const cl = schema.carListings;
const cla = schema.carListingsArchived;
const cars = schema.cars;
const lots = schema.auctionLots;

/** How many same-model cars to show in the "Подобни автомобили" carousel. */
const RELATED_LIMIT = 8;

/**
 * How many rows a related-cars POOL holds. One more than we display, because the
 * pool is keyed on the model/brand alone (see `getRelatedPool`) and therefore may
 * contain the car we're rendering — dropping it must still leave a full carousel.
 */
const RELATED_POOL_SIZE = RELATED_LIMIT + 1;

/**
 * The rich `CarDetail` for the single-car detail page (`/avtomobil/[id]`): the card
 * fields plus everything from the chosen lot's raw_json. The carousel of related
 * cars is assembled SEPARATELY by `getCarDetail` — see `getRelatedPool` for why it
 * must not be baked into this per-car entry.
 *
 * Resolution order: the ACTIVE read model (`car_listings`) first, then the
 * ARCHIVED one (`car_listings_archived`) — so a concluded/sold car still resolves
 * (the page renders it as a past result and the route noindexes it). Returns null
 * when the id is in neither (→ the route 404s).
 *
 * Unlike the catalog list (single-table, zero joins), this is a single-ROW page,
 * so the join to `cars` + the chosen `auction_lots` row (for the raw_json gallery
 * + appraisal prices) is cheap.
 *
 * Two cache layers, doing different jobs:
 *  - React `cache()` (request-scoped): the `avtomobil/[id]` route reads this in
 *    BOTH `generateMetadata` and the page body — dedup to ONE read per request
 *    (Next auto-memoizes `fetch`, but not ORM/DB calls).
 *  - `"use cache: remote"` (cross-request, per carId): the payload is stored in
 *    the Vercel Runtime Cache — durable and shared across instances in the
 *    region, handler provided automatically under `cacheComponents` (see
 *    cache-tags.ts). The ~945k-page long tail is crawler-hammered; without this
 *    every bot hit was a fresh multi-round-trip Neon read. Plain `"use cache"`
 *    was unsuitable here (per-instance LRU, ~zero hit rate over 945k keys), but
 *    a shared remote store keyed per id is exactly the rate-limited-backend case
 *    the use-cache-remote docs describe. `cacheLife("hours")` costs no real
 *    freshness: listing data changes ONLY via the hourly ingestion sync (the
 *    detail-refresh queue has no producer), so detail pages were already at most
 *    hourly-fresh. Tagged `cars` as the kill-switch if an ingestion webhook ever
 *    lands. Id validation stays OUTSIDE the cached scope so garbage ids don't
 *    burn cache writes.
 *
 * KEEP THIS ENTRY SMALL. Runtime Cache writes are billed per 8 KB unit (fra1:
 * $5.20/M) and this key space is the ~945k-page long tail, so every KB here is
 * multiplied by 945k. That is why the related-cars carousel was moved out — see
 * `getRelatedPool`.
 */
async function getCarDetailCached(carId: number): Promise<CarDetail | null> {
  "use cache: remote";
  // TWO tags on purpose: `cars` stays the site-wide kill-switch, while the
  // per-car tag lets a single-car mutation (a paid de-index) expire just this
  // entry instead of discarding all ~945k of them. See lib/cache-tags.ts.
  cacheTag(CACHE_TAGS.cars);
  cacheTag(carCacheTag(carId));
  cacheLife("hours");

  const db = getDb();

  // Find the listing row in active first, else archived. We only need the lot_id,
  // effective_price, model ids, and which table it came from.
  const activeRow = await db
    .select({
      lotId: cl.lotId,
      effectivePrice: cl.effectivePrice,
      manufacturerId: cl.manufacturerId,
      modelId: cl.modelId,
    })
    .from(cl)
    .where(eq(cl.carId, carId))
    .limit(1);

  let isPast = false;
  let listing = activeRow[0];
  if (!listing) {
    const archivedRow = await db
      .select({
        lotId: cla.lotId,
        effectivePrice: cla.effectivePrice,
        manufacturerId: cla.manufacturerId,
        modelId: cla.modelId,
      })
      .from(cla)
      .where(eq(cla.carId, carId))
      .limit(1);
    listing = archivedRow[0];
    isPast = true;
  }
  if (!listing) return null;

  // The car row (raw_json for cylinders/fuel/specs) and the chosen lot row
  // (raw_json for the gallery + appraisal prices), fetched together.
  const [carRow, lotRow] = await Promise.all([
    db
      .select({
        deindexedAt: cars.deindexedAt,
        vin: cars.vin,
        title: cars.title,
        year: cars.year,
        vehicleType: cars.vehicleType,
        bodyType: cars.bodyType,
        color: cars.color,
        fuelType: cars.fuelType,
        transmission: cars.transmission,
        driveWheel: cars.driveWheel,
        engine: cars.engine,
        generationId: cars.generationId,
        rawJson: cars.rawJson,
      })
      .from(cars)
      .where(eq(cars.id, carId))
      .limit(1),
    db
      .select({
        lotNumber: lots.lotNumber,
        domainName: lots.domainName,
        status: lots.status,
        saleDate: lots.saleDate,
        odometerKm: lots.odometerKm,
        bidPrice: lots.bidPrice,
        buyNowPrice: lots.buyNowPrice,
        finalBid: lots.finalBid,
        buyNow: lots.buyNow,
        condition: lots.condition,
        damageMain: lots.damageMain,
        seller: lots.seller,
        locationCountry: lots.locationCountry,
        locationState: lots.locationState,
        locationCity: lots.locationCity,
        imageUrl: lots.imageUrl,
        rawJson: lots.rawJson,
      })
      .from(lots)
      .where(eq(lots.id, listing.lotId))
      .limit(1),
  ]);

  const car = carRow[0];
  const lot = lotRow[0];
  if (!car || !lot) return null;

  // Paid de-index (migration 0043): resolve to null so the route calls
  // `notFound()`, which injects `noindex` even though PPR still answers 200.
  // This is the SECOND line of defence — `proxy.ts` already returns a real 410
  // for the same car before this ever runs. It matters anyway because the proxy
  // answers from a 30s per-instance snapshot and fails closed to "not gone" on a
  // DB error, and because every other caller of getCarDetail gets the same
  // suppression for free.
  if (car.deindexedAt !== null) return null;

  // Resolve brand (name + logo) / model / generation display data (not stored on the
  // listing row — same as the facets query). Best-effort: anything missing is omitted.
  const [brand, model, generation, marketAvg] = await Promise.all([
    listing.manufacturerId != null
      ? db
          .select({ name: schema.manufacturers.name, imageUrl: schema.manufacturers.imageUrl })
          .from(schema.manufacturers)
          .where(eq(schema.manufacturers.externalId, listing.manufacturerId))
          .limit(1)
      : Promise.resolve([] as { name: string | null; imageUrl: string | null }[]),
    listing.modelId != null
      ? db
          .select({ name: schema.vehicleModels.name })
          .from(schema.vehicleModels)
          .where(eq(schema.vehicleModels.externalId, listing.modelId))
          .limit(1)
      : Promise.resolve([] as { name: string | null }[]),
    car.generationId != null
      ? db
          .select({
            name: schema.vehicleGenerations.name,
            fromYear: schema.vehicleGenerations.fromYear,
            toYear: schema.vehicleGenerations.toYear,
          })
          .from(schema.vehicleGenerations)
          .where(eq(schema.vehicleGenerations.externalId, car.generationId))
          .limit(1)
      : Promise.resolve([] as { name: string | null; fromYear: number | null; toYear: number | null }[]),
    // Market benchmark: avg archive sale price for this model+year (fails soft to null).
    listing.manufacturerId != null && listing.modelId != null && car.year != null
      ? getModelYearSoldStat(listing.manufacturerId, listing.modelId, car.year)
      : Promise.resolve(null),
  ]);

  const gen = generation[0];
  const detail = carDetailFromRows({
    carId,
    car,
    lot,
    brand: brand[0]?.name ?? undefined,
    brandLogo: brand[0]?.imageUrl ?? undefined,
    model: model[0]?.name ?? undefined,
    brandExternalId: listing.manufacturerId ?? undefined,
    modelExternalId: listing.modelId ?? undefined,
    generation: gen
      ? {
          name: gen.name ?? undefined,
          fromYear: gen.fromYear ?? undefined,
          toYear: gen.toYear ?? undefined,
        }
      : undefined,
    marketAvg: marketAvg ?? undefined,
    isPast,
    effectivePrice: listing.effectivePrice != null ? Number(listing.effectivePrice) : undefined,
  });

  return detail;
}

/**
 * Request-scoped dedup over the remote-cached reads; id validation OUT here so
 * garbage ids (bot noise) return null without touching the cache.
 *
 * The two halves of the payload are cached on DIFFERENT keys on purpose: the
 * `detail` is genuinely per-car (~945k keys), the carousel is per-MODEL (~1.3k
 * keys). Assembling them here is what lets each be stored at its own cardinality.
 */
export const getCarDetail = cache(async (carId: number): Promise<CarDetailPayload | null> => {
  if (!Number.isInteger(carId) || carId <= 0) return null;

  const detail = await getCarDetailCached(carId);
  if (!detail) return null;

  // The mapper copies the listing's reference ids onto the detail, so the
  // carousel needs no extra read to find its pool keys.
  const related = await getRelatedCars(
    carId,
    detail.modelExternalId ?? null,
    detail.brandExternalId ?? null,
  );

  return { detail, related };
});

/** Which reference column a related-cars pool is keyed on. */
type RelatedPoolKind = "model" | "brand";

/**
 * A pool of the newest ACTIVE cars for one model (or one brand), from which a
 * detail page's "Подобни автомобили" carousel is drawn. Always from `car_listings`
 * — we want live, buyable suggestions even on an archived detail page.
 *
 * **Why this is its own cache entry, keyed WITHOUT the car id.** These same ~8
 * cards used to be computed inside `getCarDetailCached` and serialized into every
 * one of the ~945k per-car Runtime Cache entries — the identical rows written out
 * hundreds of times over, at $5.20 per million 8 KB write units, into a cache the
 * Vercel docs describe as ephemeral and LRU-evicted. Keyed on the model instead,
 * the whole site needs ~1,286 entries (one per model, plus ~117 brand fallbacks),
 * which is small enough to actually stay resident and be READ back rather than
 * rewritten per crawl. `cacheLife("hours")` tracks the hourly ingestion sync, the
 * same freshness the detail entry has.
 *
 * `kind` is a plain string, not the Drizzle column, because the arguments form the
 * cache key and must be serializable.
 *
 * The pool deliberately does NOT exclude the current car (that would put the car
 * id back in the key and undo the whole point) — `getRelatedCars` filters it out
 * of the RELATED_POOL_SIZE rows, which is why the pool holds one spare.
 */
async function getRelatedPool(kind: RelatedPoolKind, value: number): Promise<CarView[]> {
  "use cache: remote";
  cacheTag(CACHE_TAGS.cars);
  cacheLife("hours");

  const col = kind === "model" ? cl.modelId : cl.manufacturerId;
  const rows = await getDb()
    .select()
    .from(cl)
    .where(and(eq(col, value), sql`${cl.imageUrl} IS NOT NULL`))
    .orderBy(sql`${cl.sortId} DESC`)
    .limit(RELATED_POOL_SIZE);

  return rows.map((r) => carListingToView(r, false));
}

/**
 * Same-model (else same-brand) ACTIVE cars, newest first, excluding the current
 * car. Pure assembly over the cached pools — no DB access of its own.
 *
 * Selection is unchanged from when this issued its own queries: take the model
 * pool minus the current car; if that can't fill the carousel, REPLACE it with the
 * brand pool (not top it up — the brand pool is a superset of the model's, so
 * merging would only duplicate). Filtering a pool of RELATED_POOL_SIZE and slicing
 * to RELATED_LIMIT yields exactly the rows the old `ne(carId)` + `LIMIT 8` query
 * did, in the same sort_id order.
 */
async function getRelatedCars(
  carId: number,
  modelId: number | null,
  manufacturerId: number | null,
): Promise<CarView[]> {
  const pick = (pool: CarView[]) => pool.filter((c) => c.id !== carId).slice(0, RELATED_LIMIT);

  const fromModel = modelId != null ? pick(await getRelatedPool("model", modelId)) : [];
  if (fromModel.length >= RELATED_LIMIT || manufacturerId == null) return fromModel;

  return pick(await getRelatedPool("brand", manufacturerId));
}
