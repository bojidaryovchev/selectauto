import { and, eq, ne, sql } from "drizzle-orm";
import { carDetailFromRows } from "@/lib/car-detail-mapper";
import { carListingToView } from "@/lib/car-mapper";
import { getDb, schema } from "@/lib/db";
import { getModelYearSoldStat } from "./get-model-sold-prices.query";
import type { CarDetailPayload } from "@/types/car-detail.type";
import type { CarView } from "@/types/car.type";

const cl = schema.carListings;
const cla = schema.carListingsArchived;
const cars = schema.cars;
const lots = schema.auctionLots;

/**
 * How many same-model cars to show in the "Подобни автомобили" carousel. 12 (not 8)
 * so that when enough related cars exist the shared `CarCardsCarousel` clears its
 * infinite-`loop` floor (LOOP_MIN_SLIDES = 9) and advances without freezing; with
 * fewer real matches it safely falls back to `rewind`. See car-cards-carousel.tsx.
 */
const RELATED_LIMIT = 12;

/**
 * Full payload for the single-car detail page (`/avtomobil/[id]`): the rich
 * `CarDetail` (card fields + everything from the chosen lot's raw_json) plus a few
 * same-model related cars.
 *
 * Resolution order: the ACTIVE read model (`car_listings`) first, then the
 * ARCHIVED one (`car_listings_archived`) — so a concluded/sold car still resolves
 * (the page renders it as a past result and the route noindexes it). Returns null
 * when the id is in neither (→ the route 404s).
 *
 * Unlike the catalog list (single-table, zero joins), this is a single-ROW page,
 * so the join to `cars` + the chosen `auction_lots` row (for the raw_json gallery
 * + appraisal prices) is cheap. Not cached — reads Neon directly per request.
 */
export async function getCarDetail(carId: number): Promise<CarDetailPayload | null> {
  if (!Number.isInteger(carId) || carId <= 0) return null;

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

  const related = await getRelatedCars(carId, listing.modelId, listing.manufacturerId);

  return { detail, related };
}

/**
 * Same-model (else same-brand) ACTIVE cars, newest first, excluding the current
 * car. Always pulled from `car_listings` (we want live, buyable suggestions even
 * on an archived detail page). Single-table keyset-friendly scan; cheap at the
 * RELATED_LIMIT cap.
 */
async function getRelatedCars(
  carId: number,
  modelId: number | null,
  manufacturerId: number | null,
): Promise<CarView[]> {
  const db = getDb();

  const base = (col: typeof cl.modelId | typeof cl.manufacturerId, value: number) =>
    db
      .select()
      .from(cl)
      .where(and(eq(col, value), ne(cl.carId, carId), sql`${cl.imageUrl} IS NOT NULL`))
      .orderBy(sql`${cl.sortId} DESC`)
      .limit(RELATED_LIMIT);

  let rows = modelId != null ? await base(cl.modelId, modelId) : [];
  if (rows.length < RELATED_LIMIT && manufacturerId != null) {
    // Top up with same-brand cars when the model is sparse.
    rows = await base(cl.manufacturerId, manufacturerId);
  }

  return rows.map((r) => carListingToView(r, false));
}
