import { eq } from "drizzle-orm";
import { getAdminSession } from "@/lib/admin";
import { getDb, schema } from "@/lib/db";
import type { MobilebgCarSource } from "@/lib/mobilebg/map-car";
import { type ResolvedMapping, resolveMobilebgMapping } from "@/lib/mobilebg/resolve";
import { getCarGallery } from "./get-car-gallery.query";

/**
 * Everything the advert mapper needs about one car, read RAW.
 *
 * Deliberately not built on `getCarDetail`: that returns the presentation view
 * model, where prices are already formatted strings ("16 743 $") and values are
 * already Bulgarian labels. The mapper needs the canonical values
 * (`fuel_type='gasoline'`, `body_type='suv'`) because mobile.bg's vocabulary is
 * a different translation of the same facts, and it needs the price as a number
 * because the landed total is computed from it. Round-tripping through display
 * strings would be both lossy and fragile.
 *
 * Admin-gated: this exposes the whole raw record, and everything downstream of
 * it spends money.
 */

export type MobilebgSourceResult = {
  source: MobilebgCarSource;
  mapping: ResolvedMapping;
  /** Present when this car has been submitted to mobile.bg before. */
  advert: {
    ida: string | null;
    status: string;
    payloadHash: string | null;
    publishedAt: Date | null;
    lastError: string | null;
    pictureCount: number;
  } | null;
};

/** `raw_json.hp` — horsepower, the one engine figure upstream carries reliably. */
function hpFrom(rawCar: unknown): number | null {
  if (!rawCar || typeof rawCar !== "object") return null;
  const value = (rawCar as Record<string, unknown>).hp;
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) && n > 0 ? n : null;
}

/** `raw_json.title.name` — the legal document title (Salvage / Clean / …). */
function titleDocFrom(rawLot: unknown): string | null {
  if (!rawLot || typeof rawLot !== "object") return null;
  const title = (rawLot as Record<string, unknown>).title;
  if (!title || typeof title !== "object") return null;
  const name = (title as Record<string, unknown>).name;
  return typeof name === "string" && name.trim() ? name.trim() : null;
}

function numOrNull(value: string | number | null): number | null {
  if (value === null) return null;
  const n = typeof value === "string" ? Number(value) : value;
  return Number.isFinite(n) && n > 0 ? n : null;
}

export async function getMobilebgCarSource(
  carId: number,
  overrideModel?: string,
): Promise<MobilebgSourceResult | null> {
  if (!(await getAdminSession())) throw new Error("FORBIDDEN");
  if (!Number.isInteger(carId) || carId <= 0) return null;

  const db = getDb();

  const carRows = await db
    .select({
      vin: schema.cars.vin,
      title: schema.cars.title,
      year: schema.cars.year,
      bodyType: schema.cars.bodyType,
      vehicleType: schema.cars.vehicleType,
      color: schema.cars.color,
      fuelType: schema.cars.fuelType,
      transmission: schema.cars.transmission,
      driveWheel: schema.cars.driveWheel,
      engine: schema.cars.engine,
      manufacturerId: schema.cars.manufacturerId,
      modelId: schema.cars.modelId,
      rawJson: schema.cars.rawJson,
      deindexedAt: schema.cars.deindexedAt,
    })
    .from(schema.cars)
    .where(eq(schema.cars.id, carId))
    .limit(1);

  const car = carRows[0];
  if (!car) return null;

  // A car we were PAID to hide must not be advertised anywhere, least of all on
  // the biggest marketplace in the country.
  if (car.deindexedAt !== null) return null;

  const gallery = await getCarGallery(carId);
  if (!gallery) return null;

  // Active projection first, archived second — same order as getCarDetail.
  const active = await db
    .select({ lotId: schema.carListings.lotId, effectivePrice: schema.carListings.effectivePrice })
    .from(schema.carListings)
    .where(eq(schema.carListings.carId, carId))
    .limit(1);

  let lotId = active[0]?.lotId;
  let effectivePrice = active[0]?.effectivePrice ?? null;
  if (lotId === undefined) {
    const past = await db
      .select({
        lotId: schema.carListingsArchived.lotId,
        effectivePrice: schema.carListingsArchived.effectivePrice,
      })
      .from(schema.carListingsArchived)
      .where(eq(schema.carListingsArchived.carId, carId))
      .limit(1);
    lotId = past[0]?.lotId;
    effectivePrice = past[0]?.effectivePrice ?? null;
  }
  if (lotId === undefined) return null;

  const lotRows = await db
    .select({
      lotNumber: schema.auctionLots.lotNumber,
      domainName: schema.auctionLots.domainName,
      odometerKm: schema.auctionLots.odometerKm,
      damageMain: schema.auctionLots.damageMain,
      condition: schema.auctionLots.condition,
      locationCountry: schema.auctionLots.locationCountry,
      buyNowPrice: schema.auctionLots.buyNowPrice,
      bidPrice: schema.auctionLots.bidPrice,
      buyNow: schema.auctionLots.buyNow,
      rawJson: schema.auctionLots.rawJson,
    })
    .from(schema.auctionLots)
    .where(eq(schema.auctionLots.id, lotId))
    .limit(1);

  const lot = lotRows[0];
  if (!lot) return null;

  // Reference names (display only) + the admin-confirmed mobile.bg mapping.
  const [brandRows, modelRows, brandMapRows, modelMapRows, advertRows] = await Promise.all([
    car.manufacturerId != null
      ? db
          .select({ name: schema.manufacturers.name })
          .from(schema.manufacturers)
          .where(eq(schema.manufacturers.externalId, car.manufacturerId))
          .limit(1)
      : Promise.resolve([] as { name: string | null }[]),
    car.modelId != null
      ? db
          .select({ name: schema.vehicleModels.name })
          .from(schema.vehicleModels)
          .where(eq(schema.vehicleModels.externalId, car.modelId))
          .limit(1)
      : Promise.resolve([] as { name: string | null }[]),
    car.manufacturerId != null
      ? db
          .select({ marka: schema.mobilebgBrandMap.marka })
          .from(schema.mobilebgBrandMap)
          .where(eq(schema.mobilebgBrandMap.manufacturerExternalId, car.manufacturerId))
          .limit(1)
      : Promise.resolve([] as { marka: string }[]),
    car.modelId != null
      ? db
          .select({ marka: schema.mobilebgModelMap.marka, model: schema.mobilebgModelMap.model })
          .from(schema.mobilebgModelMap)
          .where(eq(schema.mobilebgModelMap.modelExternalId, car.modelId))
          .limit(1)
      : Promise.resolve([] as { marka: string; model: string }[]),
    db
      .select({
        ida: schema.mobilebgAdverts.ida,
        status: schema.mobilebgAdverts.status,
        payloadHash: schema.mobilebgAdverts.payloadHash,
        publishedAt: schema.mobilebgAdverts.publishedAt,
        lastError: schema.mobilebgAdverts.lastError,
        pictureCount: schema.mobilebgAdverts.pictureCount,
      })
      .from(schema.mobilebgAdverts)
      .where(eq(schema.mobilebgAdverts.carId, carId))
      .limit(1),
  ]);

  // Buy-now is the price we can honour; a bid is only a snapshot of an open
  // auction. `effective_price` already encodes that choice for the catalog, so
  // reuse it and record which kind it was.
  const buyNowPrice = numOrNull(lot.buyNowPrice);
  const priceUsd = numOrNull(effectivePrice) ?? buyNowPrice ?? numOrNull(lot.bidPrice);

  const source: MobilebgCarSource = {
    carId,
    vin: car.vin,
    title: car.title,
    year: car.year,
    bodyType: car.bodyType,
    vehicleType: car.vehicleType,
    color: car.color,
    fuelType: car.fuelType,
    transmission: car.transmission,
    driveWheel: car.driveWheel,
    engine: car.engine,
    hp: hpFrom(car.rawJson),
    manufacturerExternalId: car.manufacturerId,
    modelExternalId: car.modelId,
    brandName: brandRows[0]?.name ?? null,
    modelName: modelRows[0]?.name ?? null,
    odometerKm: lot.odometerKm,
    damageMain: lot.damageMain,
    titleDoc: titleDocFrom(lot.rawJson),
    condition: lot.condition,
    lotNumber: lot.lotNumber,
    domainName: lot.domainName,
    locationCountry: lot.locationCountry,
    images: gallery.images,
    priceUsd,
    hasBuyNow: lot.buyNow === true && buyNowPrice !== null,
    isArchived: gallery.archived,
  };

  // Remembered rows are OVERRIDES, not a prerequisite: resolution tries them
  // first, then matches against mobile.bg's live vocabulary (lib/mobilebg/resolve.ts).
  const modelRow = modelMapRows[0] ?? null;
  const mapping = await resolveMobilebgMapping({
    brandName: source.brandName,
    modelName: source.modelName,
    title: source.title,
    year: source.year,
    manualMarka: brandMapRows[0]?.marka ?? null,
    manualModel: modelRow ? { marka: modelRow.marka, model: modelRow.model } : null,
    overrideModel,
  });

  return { source, mapping, advert: advertRows[0] ?? null };
}
