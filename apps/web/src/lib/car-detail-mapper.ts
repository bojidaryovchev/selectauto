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
  odometerIsActual,
  sellerTypeLabel,
  sourceBadge,
  statusLabel,
  titleDocLabel,
  transmissionLabel,
  usageTypeLabel,
  vehicleTypeLabel,
} from "@/lib/car-labels";
import {
  buildEncarFactoryOptions,
  buildEncarHistory,
  buildEncarInspection,
  buildEncarInsurance,
  buildEncarSellerNote,
  usdFromKrw,
} from "@/lib/car-detail-encar";
import { collapseLeadingDuplicate } from "@/lib/title-clean";
import type { CarDetail, CarDetailPrice, CarDetailSpec, CarMarket } from "@/types/car-detail.type";

/** Auction source domain → market render mode. */
function deriveMarket(domainName: string | null | undefined): CarMarket {
  const d = domainName?.toLowerCase();
  if (d === "encar_com") return "kr";
  if (d === "copart_com" || d === "iaai_com") return "us";
  return "other";
}

/**
 * BG country name for the „внос от …" metadata phrasing. KR market is always
 * Korea (ENCAR sends no location); US-market lots are split by the lot's
 * `location_country` because Copart/IAAI operate branches in BOTH the USA and
 * Canada — naming the wrong country in a listing title would be worse than
 * naming none, so unknown values return undefined.
 */
function deriveSourceCountry(market: CarMarket, locationCountry: string | null | undefined): string | undefined {
  if (market === "kr") return "Корея";
  const c = locationCountry?.trim().toLowerCase();
  if (c === "usa" || c === "us" || c === "united states") return "САЩ";
  if (c === "canada" || c === "can" || c === "ca") return "Канада";
  return undefined;
}

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
  brandLogo?: string;
  model?: string;
  generation?: { name?: string; fromYear?: number; toYear?: number };
  /** Archive avg sale price for this model+year (market benchmark), when available. */
  marketAvg?: { avg: number; count: number };
  isPast: boolean;
  effectivePrice?: number;
}): CarDetail {
  const { car, lot, isPast } = opts;
  const rawLot = lot.rawJson;
  const rawCar = car.rawJson;
  const market = deriveMarket(lot.domainName);
  const sourceCountry = deriveSourceCountry(market, lot.locationCountry);

  const buyNowPrice = posNum(lot.buyNowPrice);
  const hasBuyNow = lot.buyNow === true && !!buyNowPrice;
  const isAuction = !hasBuyNow;

  // Same upstream-title hygiene as the card mapper (see lib/title-clean.ts) so
  // the <h1>, metadata <title> and JSON-LD never carry the duplicated block.
  const cleanTitle = collapseLeadingDuplicate(car.title?.trim() ?? "");
  const title =
    (cleanTitle && car.year && !/^\d{4}\b/.test(cleanTitle)
      ? `${car.year} ${cleanTitle}`
      : cleanTitle) || `Лот ${lot.lotNumber ?? opts.carId}`;

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
  // Generation (name + year range) — resolved from vehicle_generations upstream.
  const gen = opts.generation;
  const genLabel = gen
    ? [gen.name, gen.fromYear ? `(${gen.fromYear}–${gen.toYear ?? "…"})` : undefined].filter(Boolean).join(" ")
    : "";
  pushSpec("Поколение", genLabel || undefined);
  pushSpec("Двигател", car.engine ?? undefined);
  const hp = posNum(get(rawCar, "hp"));
  pushSpec("Мощност", hp ? `${hp} к.с.` : undefined);
  const cylinders = posNum(get(rawCar, "cylinders"));
  pushSpec("Цилиндри", cylinders ? String(cylinders) : undefined);
  pushSpec("Скоростна кутия", transmissionLabel(car.transmission) || undefined);
  pushSpec("Задвижване", driveLabel(car.driveWheel) || undefined);
  pushSpec("Цвят", colorLabel(car.color) || undefined);

  // ENCAR "basic info" extras — all live in details.* (US lots leave them null). The
  // engine field is a bare code (e.g. "G4KN") for Encar, so the displacement/seat/
  // first-registration numbers are the readable specs a KR buyer actually wants.
  if (market === "kr") {
    const cc = posNum(get(rawLot, "details.engine_volume"));
    pushSpec("Обем на двигателя", cc ? `${cc.toLocaleString("bg-BG").replace(/ /g, " ")} куб.см` : undefined);
    const seats = posNum(get(rawLot, "details.seats_count"));
    pushSpec("Брой места", seats ? String(seats) : undefined);
    const frY = posNum(get(rawLot, "details.first_registration.year"));
    const frM = posNum(get(rawLot, "details.first_registration.month"));
    pushSpec("Първа регистрация", frY ? (frM ? `${String(frM).padStart(2, "0")}.${frY}` : String(frY)) : undefined);
    pushSpec("Цена като нов", usdFromKrw(get(rawLot, "details.original_price")));
  }

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

  // Selling context (the seller NAME is surfaced as its own card — see `seller` below)
  pushSpec("Тип продавач", sellerTypeLabel(s(get(rawLot, "seller_type.name"))) || undefined);
  pushSpec("Вид търг", auctionTypeLabel(s(get(rawLot, "auction_type.name"))) || undefined);
  pushSpec("Локация (склад)", s(get(rawLot, "selling_branch.name")));
  pushSpec("Лот №", lot.lotNumber ?? undefined);
  pushSpec("VIN", car.vin ?? undefined);

  // ── Location string ("Glassboro, New Jersey, USA") ──
  const locParts = [lot.locationCity, lot.locationState, lot.locationCountry]
    .map((p) => s(p))
    .filter(Boolean) as string[];
  const location = locParts.length > 0 ? titleCaseLoose(locParts.join(", ")) : undefined;

  // Lot coordinates → map. Present on US Copart/IAAI branches (ENCAR sends null).
  // Validate range and reject a null-island (0,0) so we never map the Atlantic.
  const latRaw = get(rawLot, "location.latitude");
  const lngRaw = get(rawLot, "location.longitude");
  const lat = typeof latRaw === "number" ? latRaw : Number(latRaw);
  const lng = typeof lngRaw === "number" ? lngRaw : Number(lngRaw);
  const geo =
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    Math.abs(lat) <= 90 &&
    Math.abs(lng) <= 180 &&
    (lat !== 0 || lng !== 0)
      ? { lat, lng }
      : undefined;

  // ── Media beyond the still gallery (both markets) ──
  const hiRes: string[] = [];
  const bigImgs = get(rawLot, "images.big");
  if (Array.isArray(bigImgs)) for (const u of bigImgs) { const url = s(u); if (url) hiRes.push(url); }
  const panorama360 = s(get(rawLot, "images.external_panorama_url"));
  const engineVideo = s(get(rawLot, "images.video"));
  const media =
    panorama360 || engineVideo || hiRes.length > 0 ? { panorama360, engineVideo, hiRes } : undefined;

  // ── US-market extras (Copart/IAAI) ──
  // `tags` is USUALLY an array but the API can send a scalar — coerce defensively.
  const rawTags = get(rawLot, "tags");
  const usTags =
    market === "us" && Array.isArray(rawTags)
      ? (rawTags.map((t) => s(t)).filter(Boolean) as string[])
      : undefined;

  // Live current bid + freshness — only meaningful on an active US auction lot.
  const bidVal = posNum(get(rawLot, "bid"));
  const liveBid =
    market === "us" && !isPast && isAuction && bidVal
      ? { value: eur(bidVal)!, updatedAt: s(get(rawLot, "bid_updated_at")) }
      : undefined;

  // Selling party (+ insurer logo for IAAI). Only surface a card when a name exists.
  const sellerName = s(lot.seller);
  const sellerLogo = market === "us" ? s(get(rawLot, "seller.logo")) : undefined;
  const seller = sellerName || sellerLogo ? { name: sellerName, logo: sellerLogo } : undefined;

  // Mileage authenticity — flag ONLY the exception (a confirmed non-actual reading);
  // "actual" and unknown stay silent so the common case adds no noise.
  const odoStatus = s(get(rawLot, "odometer.status.name"));
  const odometerNotActual = market === "us" && !!odoStatus && !odometerIsActual(odoStatus);

  // IAA Vehicle Score — an IAAI-only native 0–50 AI damage rating in raw_json,
  // surfaced as its own visual meter (CarIaaScore) rather than a spec-sheet row.
  // Guard hard on BOTH conditions or the card renders a false "non-repairable":
  //   1. Source is IAAI. Copart/Encar lots ALSO carry a `grade_iaai` key, but it's
  //      always null (the score is an IAAI product), so the card must never leak
  //      onto them.
  //   2. The value is a real number. An unscored lot stores `grade_iaai: null`
  //      (~13% of IAAI lots) — and `Number(null) === 0` would otherwise coerce it
  //      into a bogus "0 / 50 — non-repairable". `typeof … === "number"` rejects
  //      null/strings without coercion. A genuine numeric 0 IS a valid score (real
  //      non-repairable), so it stays; and we never divide by 10 (`37` = 37 / 50).
  const gradeRaw = lot.domainName?.toLowerCase() === "iaai_com" ? get(rawLot, "grade_iaai") : undefined;
  const iaaScore =
    typeof gradeRaw === "number" && Number.isFinite(gradeRaw) && gradeRaw >= 0 && gradeRaw <= 50
      ? Math.round(gradeRaw)
      : undefined;

  // ── KR-market blocks (ENCAR). `details` is null on US lots and on ARCHIVED encar
  //    lots (stripped to price-only), so every builder no-ops off-market/when absent. ──
  const rawDetails = market === "kr" ? get(rawLot, "details") : undefined;
  // Prior-use caution flag (ex-rental / business), when Encar records one.
  const usageFlag = rawDetails ? usageTypeLabel(s(get(rawLot, "details.usage_types.0.title"))) || undefined : undefined;
  const history = rawDetails ? buildEncarHistory(rawDetails) : undefined;
  const insurance = rawDetails ? buildEncarInsurance(rawDetails) : undefined;
  const inspection = rawDetails ? buildEncarInspection(rawDetails) : undefined;
  const factoryOptions = rawDetails ? buildEncarFactoryOptions(rawDetails) : undefined;
  const sellerNote = rawDetails ? buildEncarSellerNote(rawDetails) : undefined;

  return {
    id: opts.carId,
    title,
    brand: opts.brand,
    brandLogo: opts.brandLogo,
    model: opts.model,
    generation: opts.generation,
    year: car.year ?? undefined,
    vin: car.vin ?? undefined,
    source: sourceBadge(lot.domainName),
    market,
    sourceCountry,
    lotNumber: lot.lotNumber ?? undefined,
    status: statusLabel(lot.status),
    isPast,
    isAuction: isPast ? false : isAuction,
    hasBuyNow: isPast ? false : hasBuyNow,
    saleDate: lot.saleDate ? lot.saleDate.toISOString() : undefined,
    images,
    prices,
    marketAvg: opts.marketAvg ? { value: eur(opts.marketAvg.avg)!, count: opts.marketAvg.count } : undefined,
    highlights,
    specs,
    location,
    geo,
    media,
    usTags,
    iaaScore,
    liveBid,
    seller,
    odometerNotActual: odometerNotActual || undefined,
    usageFlag,
    history: history && history.length > 0 ? history : undefined,
    insurance,
    inspection,
    factoryOptions,
    sellerNote,
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
