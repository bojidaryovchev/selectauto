/**
 * Normalization: transform raw AuctionsAPI payloads into our DB row shapes.
 *
 * Design rules:
 *   - Never assume a field exists. Every access is guarded; missing -> null.
 *   - Always keep the full upstream object in raw_json for future reprocessing.
 *   - Where a mapping is uncertain (units, flag-vs-price, image choice, etc.),
 *     leave a TODO so a maintainer can verify against live data.
 *
 * Field mappings below are derived from a REAL sample `/api/cars` record
 * (see README "Sample payload"). They are best-effort, not contractual.
 */
import type { ApiArchivedLot, ApiCar, ApiLot } from "./types.js";

export interface NormalizedCar {
  externalCarId: number | null;
  vin: string | null;
  title: string | null;
  year: number | null;
  manufacturerId: number | null;
  modelId: number | null;
  generationId: number | null;
  bodyType: string | null;
  /** Top-level API category (automobile/truck/motorcycle/boat/atv/…). */
  vehicleType: string | null;
  color: string | null;
  fuelType: string | null;
  transmission: string | null;
  driveWheel: string | null;
  engine: string | null;
  rawJson: unknown;
}

export interface NormalizedLot {
  externalLotId: number | null;
  lotNumber: string | null;
  domainId: number | null;
  domainName: string | null;
  status: string | null;
  saleDate: string | null; // ISO string or null; Postgres casts to timestamptz
  odometerKm: number | null;
  bidPrice: number | null;
  buyNowPrice: number | null;
  finalBid: number | null;
  buyNow: boolean | null;
  condition: string | null;
  damageMain: string | null;
  seller: string | null;
  locationCountry: string | null;
  locationState: string | null;
  locationCity: string | null;
  imageUrl: string | null;
  // The lot's archived state, carried by the API on every lot object (both
  // /api/cars and the search-* detail endpoints — e.g. a directly looked-up lot
  // can be `archived: true, status: "sold"`). Persist it so the active upsert
  // never silently resurrects an archived lot (the car_listings read model
  // filters on archived=false). null when the field is absent.
  archived: boolean | null;
  archivedAt: string | null; // ISO string or null
  rawJson: unknown;
}

export function normalizeCar(raw: ApiCar): NormalizedCar {
  return {
    externalCarId: num(raw.id),
    vin: str(raw.vin),
    title: str(raw.title),
    year: num(raw.year),
    // manufacturer/model/generation come as { id, name }; we store the external id.
    manufacturerId: num(raw.manufacturer?.id),
    modelId: num(raw.model?.id),
    generationId: num(raw.generation?.id),
    bodyType: str(raw.body_type?.name),
    vehicleType: str(raw.vehicle_type?.name),
    color: str(raw.color?.name),
    // NOTE: the field is `fuel` upstream, mapped to our `fuel_type` column.
    fuelType: str(raw.fuel?.name),
    transmission: str(raw.transmission?.name),
    driveWheel: str(raw.drive_wheel?.name),
    // engine is { id, name }; we keep the human-readable name. engine.id lives in raw_json.
    engine: str(raw.engine?.name),
    rawJson: raw,
  };
}

export function normalizeLot(raw: ApiLot): NormalizedLot {
  return {
    externalLotId: num(raw.id),
    // `lot` may come as number or string; coerce to string for the unique key.
    lotNumber: raw.lot === null || raw.lot === undefined ? null : String(raw.lot),
    domainId: num(raw.domain?.id),
    domainName: str(raw.domain?.name),
    status: str(raw.status?.name),
    saleDate: str(raw.sale_date),
    odometerKm: num(raw.odometer?.km),

    // Prices are integers in the upstream payload (e.g. actual_cash_value: 8776).
    // In /api/cars these are scalars (bid: null, buy_now: 0). In other endpoints
    // they can arrive as { value, updated_at }; coerceValue handles both.
    bidPrice: coerceValueNum(raw.bid),
    buyNowPrice: coerceValueNum(raw.buy_now),
    finalBid: coerceValueNum(raw.final_bid),
    // buyNow boolean: true when there is a positive buy-now price.
    buyNow: buyNowFlag(raw.buy_now),

    condition: str(raw.condition?.name),
    damageMain: str(raw.damage?.main?.name),
    seller: str(raw.seller?.name),
    locationCountry: str(raw.location?.country?.name),
    locationState: str(raw.location?.state?.name),
    locationCity: str(raw.location?.city?.name),
    // Prefer the CDN-hosted "downloaded" copies (stable, our-domain). Fall back
    // to the first "normal" URL. TODO: decide if we want to store all images.
    imageUrl: firstImage(raw),
    // `archived` is a boolean on the lot; coerce defensively (absent -> null).
    archived: typeof raw.archived === "boolean" ? raw.archived : null,
    archivedAt: str(raw.archived_at),
    rawJson: raw,
  };
}

/* ---------------------------------------------------------------------------
 * Archived lot normalizer — FLAT shape from /api/archived-lots (CONFIRMED).
 * Maps onto the same auction_lots columns we use for active lots, so the archive
 * handler can upsert via (domain_id, lot_number) just like the active flow.
 * ------------------------------------------------------------------------ */

export interface NormalizedArchivedLot {
  externalLotId: number | null; // lot_id
  externalCarId: number | null; // car_id (to attempt linkage)
  vin: string | null;
  lotNumber: string | null;
  domainId: number | null;
  domainName: string | null;
  status: string | null;
  bidPrice: number | null;
  buyNowPrice: number | null;
  finalBid: number | null;
  saleDate: string | null;
  archivedAt: string | null;
  rawJson: unknown;
}

export function normalizeArchivedLot(raw: ApiArchivedLot): NormalizedArchivedLot {
  return {
    externalLotId: num(raw.lot_id),
    externalCarId: num(raw.car_id),
    vin: str(raw.vin),
    lotNumber: raw.lot === null || raw.lot === undefined ? null : String(raw.lot),
    domainId: num(raw.domain?.id),
    domainName: str(raw.domain?.name),
    status: str(raw.status?.name),
    // These are { value, updated_at } objects in archived-lots.
    bidPrice: coerceValueNum(raw.bid),
    buyNowPrice: coerceValueNum(raw.buy_now),
    finalBid: coerceValueNum(raw.final_bid),
    saleDate: coerceValueStr(raw.sale_date),
    archivedAt: str(raw.archived_at),
    rawJson: raw,
  };
}

/* ---------------------------------------------------------------------------
 * Reference data normalizers — field names CONFIRMED against the live API.
 *   manufacturers: { id, name, cars_qty, image, models_qty }
 *   models:        { id, name, cars_qty, manufacturer_id, generations_qty }
 *   generations:   { id, name, cars_qty, from_year, to_year, model_id }
 * ------------------------------------------------------------------------ */

export function normalizeManufacturer(raw: Record<string, unknown>) {
  return {
    externalId: num(raw.id),
    name: str(raw.name),
    imageUrl: str(raw.image),
    carsQty: num(raw.cars_qty),
    rawJson: raw,
  };
}

export function normalizeModel(raw: Record<string, unknown>) {
  return {
    externalId: num(raw.id),
    manufacturerExternalId: num(raw.manufacturer_id),
    name: str(raw.name),
    // Models endpoint has no image; column stays null (kept for schema symmetry).
    imageUrl: null as string | null,
    carsQty: num(raw.cars_qty),
    rawJson: raw,
  };
}

export function normalizeGeneration(raw: Record<string, unknown>) {
  return {
    externalId: num(raw.id),
    modelExternalId: num(raw.model_id),
    name: str(raw.name),
    fromYear: num(raw.from_year),
    toYear: num(raw.to_year),
    rawJson: raw,
  };
}

/* ---------------------------------------------------------------------------
 * Small guarded coercion helpers.
 * ------------------------------------------------------------------------ */

function num(v: unknown): number | null {
  if (v === null || v === undefined) return null;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

/**
 * Coerce a price/number field that may arrive as either a scalar (e.g. /api/cars
 * `buy_now: 0`) OR a `{ value, updated_at }` wrapper (e.g. /api/archived-lots
 * `bid: { value: 8300 }`). Returns the numeric value or null.
 */
function coerceValueNum(v: unknown): number | null {
  if (v && typeof v === "object" && "value" in (v as Record<string, unknown>)) {
    return num((v as { value: unknown }).value);
  }
  return num(v);
}

/** String variant of coerceValueNum (for sale_date as scalar or {value}). */
function coerceValueStr(v: unknown): string | null {
  if (v && typeof v === "object" && "value" in (v as Record<string, unknown>)) {
    return str((v as { value: unknown }).value);
  }
  return str(v);
}

/** Derive the buy_now boolean flag from a scalar or {value} buy-now price. */
function buyNowFlag(v: unknown): boolean | null {
  const n = coerceValueNum(v);
  return n === null ? null : n > 0;
}

function str(v: unknown): string | null {
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  return s.length === 0 ? null : s;
}

function firstImage(raw: ApiLot): string | null {
  const imgs = raw.images;
  if (!imgs) return null;
  const downloaded = Array.isArray(imgs.downloaded) ? imgs.downloaded : [];
  if (downloaded.length > 0 && typeof downloaded[0] === "string") return downloaded[0];
  const normal = Array.isArray(imgs.normal) ? imgs.normal : [];
  if (normal.length > 0 && typeof normal[0] === "string") return normal[0];
  return null;
}
