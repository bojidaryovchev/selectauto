import type { Car, AuctionLot } from "@auctions-ingestion/db/schema";
import {
  airbagsLabel,
  auctionTypeLabel,
  bodyTypeLabel,
  colorLabel,
  conditionLabel,
  damageLabel,
  driveLabel,
  fuelLabel,
  keysLabel,
  sellerTypeLabel,
  sourceBadge,
  statusLabel,
  titleDocLabel,
  transmissionLabel,
  vehicleTypeLabel,
} from "@/lib/car-labels";
import type { CarDetail, CarDetailPrice, CarDetailSpec } from "@/types/car-detail.type";

/**
 * Builds the rich `CarDetail` view-model for `/avtomobil/[id]` from the `cars` row
 * and its chosen `auction_lots` row. Most of what makes the detail page richer than
 * the card (the full image gallery, appraisal prices, branch/keys/airbags/titles)
 * lives ONLY in the lot's `raw_json` — so this is the one place we read into it.
 * raw_json is untyped JSON, so every access is defensively guarded (mirroring
 * `normalize.ts`), and BG localization is applied here on the way out.
 */

/** A minimal nested-name accessor: get(obj, "a.b.name") → string | undefined. */
function get(obj: unknown, path: string): unknown {
  let cur: unknown = obj;
  for (const key of path.split(".")) {
    if (cur == null || typeof cur !== "object") return undefined;
    cur = (cur as Record<string, unknown>)[key];
  }
  return cur;
}

/** Coerce to a trimmed non-empty string, else undefined. */
function s(v: unknown): string | undefined {
  if (v == null) return undefined;
  const t = String(v).trim();
  return t.length === 0 ? undefined : t;
}

/** Coerce to a finite positive number, else undefined (filters junk like -1, 0). */
function posNum(v: unknown): number | undefined {
  if (v == null) return undefined;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) && n > 0 ? n : undefined;
}

/** "16 743 $" (thin-space grouping, matching the card mapper). */
function eur(n: number | undefined): string | undefined {
  if (n === undefined) return undefined;
  return `${Math.round(n).toLocaleString("bg-BG").replace(/ /g, " ")} $`;
}

/** Latin "km" grouping, matching the rich card. */
function km(n: number | null | undefined): string | undefined {
  if (n == null || !Number.isFinite(n) || n < 0) return undefined;
  return `${Math.round(n).toLocaleString("bg-BG").replace(/ /g, " ")} km`;
}

/**
 * Ordered, de-duplicated gallery URLs. The lot's raw_json carries several image
 * sets: `downloaded` (a few stable CDN copies — our domain), `normal` (the full
 * set, often 10-20), `big` (hi-res variants). We lead with `downloaded` (stable),
 * then `normal` for the long tail, and fall back to the stored `image_url`.
 */
function buildGallery(rawLot: unknown, fallbackUrl: string | null): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  const push = (arr: unknown) => {
    if (!Array.isArray(arr)) return;
    for (const u of arr) {
      const url = s(u);
      if (url && !seen.has(url)) {
        seen.add(url);
        out.push(url);
      }
    }
  };
  push(get(rawLot, "images.downloaded"));
  push(get(rawLot, "images.normal"));
  if (out.length === 0 && fallbackUrl) out.push(fallbackUrl);
  return out;
}

/**
 * The price rows. The card shows one effective price; the detail page can show the
 * appraisal context that helps a salvage buyer judge the deal: the actual cash
 * value (pre-loss market value), estimated repair cost, and the clean wholesale /
 * pre-accident benchmarks — all from raw_json, all optional.
 */
function buildPrices(opts: {
  isPast: boolean;
  hasBuyNow: boolean;
  effective?: number;
  buyNowPrice?: number;
  rawLot: unknown;
}): CarDetailPrice[] {
  const prices: CarDetailPrice[] = [];

  if (opts.isPast) {
    if (opts.effective) prices.push({ label: "Продаден за", value: eur(opts.effective)!, primary: true });
  } else if (opts.hasBuyNow && opts.buyNowPrice) {
    prices.push({ label: "Купи сега", value: eur(opts.buyNowPrice)!, primary: true });
  } else if (opts.effective) {
    prices.push({ label: "Текуща цена", value: eur(opts.effective)!, primary: true });
  }

  const acv = posNum(get(opts.rawLot, "actual_cash_value"));
  if (acv) prices.push({ label: "Пазарна стойност (ACV)", value: eur(acv)! });

  const repair = posNum(get(opts.rawLot, "estimate_repair_price"));
  if (repair) prices.push({ label: "Очаквана стойност на ремонт", value: eur(repair)! });

  const clean = posNum(get(opts.rawLot, "clean_wholesale_price"));
  if (clean) prices.push({ label: "Стойност на едро (чист)", value: eur(clean)! });

  const preAccident = posNum(get(opts.rawLot, "pre_accident_price"));
  if (preAccident) prices.push({ label: "Стойност преди щетата", value: eur(preAccident)! });

  return prices;
}

export function carDetailFromRows(opts: {
  carId: number;
  car: Pick<
    Car,
    | "vin"
    | "title"
    | "year"
    | "vehicleType"
    | "bodyType"
    | "color"
    | "fuelType"
    | "transmission"
    | "driveWheel"
    | "engine"
    | "rawJson"
  >;
  lot: Pick<
    AuctionLot,
    | "lotNumber"
    | "domainName"
    | "status"
    | "saleDate"
    | "odometerKm"
    | "bidPrice"
    | "buyNowPrice"
    | "finalBid"
    | "buyNow"
    | "condition"
    | "damageMain"
    | "seller"
    | "locationCountry"
    | "locationState"
    | "locationCity"
    | "imageUrl"
    | "rawJson"
  >;
  brand?: string;
  model?: string;
  isPast: boolean;
  effectivePrice?: number;
}): CarDetail {
  const { car, lot, isPast } = opts;
  const rawLot = lot.rawJson;
  const rawCar = car.rawJson;

  const buyNowPrice = posNum(lot.buyNowPrice);
  const hasBuyNow = lot.buyNow === true && !!buyNowPrice;
  const isAuction = !hasBuyNow;

  const title =
    (car.title?.trim() && car.year && !/^\d{4}\b/.test(car.title.trim())
      ? `${car.year} ${car.title.trim()}`
      : car.title?.trim()) || `Лот ${lot.lotNumber ?? opts.carId}`;

  const images = buildGallery(rawLot, lot.imageUrl);

  const prices = buildPrices({
    isPast,
    hasBuyNow,
    effective: opts.effectivePrice,
    buyNowPrice,
    rawLot,
  });

  // ── Highlights (the at-a-glance chips under the title) ──
  const highlights: CarDetailSpec[] = [];
  const pushHl = (label: string, value: string | undefined) => {
    if (value) highlights.push({ label, value });
  };
  pushHl("Година", car.year ? String(car.year) : undefined);
  pushHl("Пробег", km(lot.odometerKm));
  pushHl("Гориво", fuelLabel(car.fuelType) || undefined);
  pushHl("Състояние", conditionLabel(lot.condition) || undefined);

  // ── Full spec sheet ──
  const specs: CarDetailSpec[] = [];
  const pushSpec = (label: string, value: string | undefined) => {
    if (value) specs.push({ label, value });
  };

  // Vehicle / body type
  const typeLabel =
    car.vehicleType && car.vehicleType !== "automobile"
      ? vehicleTypeLabel(car.vehicleType)
      : bodyTypeLabel(car.bodyType);
  pushSpec("Тип", typeLabel || undefined);
  pushSpec("Двигател", car.engine ?? undefined);
  const cylinders = posNum(get(rawCar, "cylinders"));
  pushSpec("Цилиндри", cylinders ? String(cylinders) : undefined);
  pushSpec("Скоростна кутия", transmissionLabel(car.transmission) || undefined);
  pushSpec("Задвижване", driveLabel(car.driveWheel) || undefined);
  pushSpec("Цвят", colorLabel(car.color) || undefined);

  // Damage (primary + secondary from raw_json)
  pushSpec("Първична щета", damageLabel(lot.damageMain) || undefined);
  const damage2 = s(get(rawLot, "damage.second.name"));
  pushSpec("Вторична щета", damage2 ? damageLabel(damage2) : undefined);

  // Title / legal status
  const titleDoc = s(get(rawLot, "detailed_title.name")) ?? s(get(rawLot, "title.name"));
  pushSpec("Документ", titleDoc ? titleDocLabel(titleDoc) : undefined);

  // Keys / airbags
  const keysAvail = get(rawLot, "keys_available");
  pushSpec("Ключове", keysLabel(typeof keysAvail === "boolean" ? keysAvail : undefined) || undefined);
  pushSpec("Еърбегове", airbagsLabel(s(get(rawLot, "airbags.name"))) || undefined);

  // Selling context
  pushSpec("Продавач", lot.seller ?? undefined);
  pushSpec("Тип продавач", sellerTypeLabel(s(get(rawLot, "seller_type.name"))) || undefined);
  pushSpec("Вид търг", auctionTypeLabel(s(get(rawLot, "auction_type.name"))) || undefined);
  pushSpec("Локация (склад)", s(get(rawLot, "selling_branch.name")));
  const grade = s(get(rawLot, "grade_iaai"));
  pushSpec("IAAI оценка", grade);
  pushSpec("Лот №", lot.lotNumber ?? undefined);
  pushSpec("VIN", car.vin ?? undefined);

  // ── Location string ("Glassboro, New Jersey, USA") ──
  const locParts = [lot.locationCity, lot.locationState, lot.locationCountry]
    .map((p) => s(p))
    .filter(Boolean) as string[];
  const location = locParts.length > 0 ? titleCaseLoose(locParts.join(", ")) : undefined;

  return {
    id: opts.carId,
    title,
    brand: opts.brand,
    model: opts.model,
    year: car.year ?? undefined,
    vin: car.vin ?? undefined,
    source: sourceBadge(lot.domainName),
    lotNumber: lot.lotNumber ?? undefined,
    status: statusLabel(lot.status),
    isPast,
    isAuction: isPast ? false : isAuction,
    hasBuyNow: isPast ? false : hasBuyNow,
    saleDate: lot.saleDate ? lot.saleDate.toISOString() : undefined,
    images,
    prices,
    highlights,
    specs,
    location,
  };
}

/** Loosely title-case a comma-joined location ("glassboro, new jersey, USA"). */
function titleCaseLoose(str: string): string {
  return str
    .split(", ")
    .map((part) =>
      // Keep all-caps tokens (USA) as-is; title-case the rest word by word.
      part === part.toUpperCase()
        ? part
        : part.replace(/\b\w/g, (c) => c.toUpperCase()),
    )
    .join(", ");
}
