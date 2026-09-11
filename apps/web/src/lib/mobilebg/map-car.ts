import "server-only";
import { BUSINESS, CONTACT, SITE_URL } from "@/constants";
import {
  type CalcConfig,
  type UsAuction,
  calcVehicleTypeFromBody,
  computeImportBreakdown,
} from "@/data/import-rates";
import { damageLabel, titleDocLabel } from "@/lib/car-labels";

/**
 * Turn one catalog car into the exact POST body `advertpub` expects.
 *
 * ── The two rules this file exists to enforce ───────────────────────────────
 *
 * **1. Never invent a value.** Every `list` field of mobile.bg's form is a closed
 * vocabulary, and their API does not reliably reject a wrong one — it accepts it
 * and files the advert where no buyer will look, after we have been charged. So
 * an unmappable value becomes a WARNING (field omitted) or a BLOCKER (publish
 * refused), never a plausible-looking guess. Brand and model in particular are
 * resolved by lib/mobilebg/resolve.ts — admin overrides first, then only exact
 * evidence against mobile.bg's live lists; there is deliberately no fuzzy match.
 *
 * **2. Never advertise the auction price.** `car_listings.effective_price` is the
 * US/KR auction bid or buy-now in USD — roughly half what the car costs a
 * Bulgarian buyer once transport, duty, VAT and fees are paid. Publishing it
 * would be a materially false advert. The number that goes out is the landed
 * total from `computeImportBreakdown` (the same model behind /kalkulator),
 * converted to EUR and marked up by the admin-set `mobilebgMarkupPct`.
 *
 * Everything the mapper could not fill is returned as a structured warning so
 * the admin preview shows the gap and can override it by hand before sending.
 */

/* ------------------------------------------------------------------------- */
/* Vocabulary maps — our canonical values → mobile.bg's exact strings          */
/* ------------------------------------------------------------------------- */

/**
 * `cars.color` → mobile.bg `color`. Their palette has 41 entries, ours 19.
 *
 * 17 map exactly. `turquoise` and `two_colors` have NO equivalent in their list
 * and are deliberately absent: colour is cosmetic, and omitting it costs a
 * filter hit, whereas guessing („Светло син" for turquoise) writes a false fact
 * into the advert.
 */
const COLOR_TO_MOBILEBG: Record<string, string> = {
  white: "Бял",
  black: "Черен",
  grey: "Сив",
  silver: "Сребърен",
  blue: "Син",
  red: "Червен",
  green: "Зелен",
  yellow: "Жълт",
  orange: "Оранжев",
  brown: "Кафяв",
  beige: "Бежов",
  gold: "Златист",
  bronze: "Бронз",
  cream: "Кремав",
  purple: "Лилав",
  pink: "Розов",
  charcoal: "Графит",
};

/**
 * `cars.body_type` → mobile.bg `category`.
 *
 * Only shapes that genuinely belong under topmenu=1 („Автомобили и Джипове")
 * appear. `furgon`, `truck`, `bus`, `trailer` and every moto/industrial body are
 * absent ON PURPOSE — those are separate top categories at mobile.bg (Бусове=3,
 * Камиони=4, Мотоциклети=5 …), so publishing one here would put it in the wrong
 * marketplace section entirely. `isPublishableBody` turns that into a blocker.
 */
const BODY_TO_CATEGORY: Record<string, string> = {
  sedan: "Седан",
  suv: "Джип",
  hatchback: "Хечбек",
  liftback: "Хечбек",
  wagon: "Комби",
  combi: "Комби",
  coupe: "Купе",
  sport_car: "Купе",
  cabrio: "Кабрио",
  roadster: "Кабрио",
  pickup: "Пикап",
  van: "Ван",
  limousine: "Стреч лимузина",
};

/** `cars.fuel_type` → mobile.bg `engine_type` (7 values). */
const FUEL_TO_ENGINE_TYPE: Record<string, string> = {
  gasoline: "Бензинов",
  petrol: "Бензинов",
  diesel: "Дизелов",
  hybrid: "Хибриден",
  electric: "Електрически",
  hydrogen: "Водород",
  // Their vocabulary has one „Газ" bucket; which gas it is goes into `extri`
  // („Газова уредба" / „Метанова уредба"), which is where they express it too.
  gas: "Газ",
  lpg: "Газ",
  cng: "Газ",
  // A flex-fuel vehicle IS a petrol engine (it merely tolerates high ethanol),
  // and mobile.bg has no flex bucket. Mapped, but reported as an inference.
  flexible: "Бензинов",
};

/** `cars.transmission` → mobile.bg `transmission`. Exact match, both directions. */
const TRANSMISSION_TO_MOBILEBG: Record<string, string> = {
  automatic: "Автоматична",
  manual: "Ръчна",
};

/**
 * `auction_lots.condition` values that mean the car does NOT simply run — these
 * force `nup=3` („Повреден/ударен") regardless of what the damage field says.
 */
const NON_RUNNING_CONDITIONS = new Set(["for_repair", "to_be_dismantled", "not_run"]);

/**
 * Damage values that do NOT make a car „повреден" in the sense a Bulgarian buyer
 * reads it. Everything else — any real damage entry — flips the advert to
 * „Повреден/ударен", because listing a wrecked import as merely „Употребяван" is
 * the misrepresentation this whole feature must avoid.
 */
const BENIGN_DAMAGE = new Set([
  "normal wear & tear",
  "normal wear",
  "minor dent/scratches",
  "unknown",
  "none",
]);

/* ------------------------------------------------------------------------- */
/* Input / output shapes                                                      */
/* ------------------------------------------------------------------------- */

/** The raw columns the mapper needs — assembled by `getMobilebgCarSource`. */
export type MobilebgCarSource = {
  carId: number;
  vin: string | null;
  title: string | null;
  year: number | null;
  bodyType: string | null;
  vehicleType: string | null;
  color: string | null;
  fuelType: string | null;
  transmission: string | null;
  driveWheel: string | null;
  engine: string | null;
  /** `cars.raw_json.hp` — horsepower, when upstream carried it. */
  hp: number | null;
  manufacturerExternalId: number | null;
  modelExternalId: number | null;
  /** Our own reference names, for the admin UI only — never sent. */
  brandName: string | null;
  modelName: string | null;

  odometerKm: number | null;
  damageMain: string | null;
  /** `raw_json.title.name` — the legal document title (Salvage / Clean / …). */
  titleDoc: string | null;
  condition: string | null;
  lotNumber: string | null;
  domainName: string | null;
  locationCountry: string | null;
  /** US transport to Holland for this lot's yard (inland + container, USD) —
   *  the same tariff lookup the site's calculator uses. NULL when the yard is
   *  not in the tariff table, or the lot is not a Copart/IAAI US lot. */
  usTransport: { inland: number; container: number } | null;
  /** Canada only: the lot sits in British Columbia (pricier west-coast leg). */
  caFromBc: boolean;
  /** Gallery URLs from the lot, already ordered and de-duplicated. */
  images: string[];

  /** The auction price in USD (buy-now when present, else the current bid). */
  priceUsd: number | null;
  /** False when the price is a live bid that will still move. */
  hasBuyNow: boolean;
  isArchived: boolean;
};

/** An admin-confirmed brand/model pair from the mapping tables. */
export type MobilebgMapping = {
  marka: string | null;
  model: string | null;
};

/** Fields an admin may fill or correct by hand in the preview before sending. */
export type MobilebgOverrides = {
  /** Production month („януари"…„декември") — we only store the year. */
  month?: string;
  /** City within `locat`; their dependent list is empty unauthenticated. */
  locatc?: string;
  /** Advert validity in days: 35 or 49. */
  term?: string;
  /** Replace the computed price (EUR) entirely. */
  priceEur?: number;
  /** Publish as „Цена при запитване" instead of a number. */
  priceOnRequest?: boolean;
  /** Extra `extri` feature strings to add, on top of the derived ones. */
  extri?: string[];
  /** Replace the generated description. */
  extinfo?: string;
  /** mobile.bg model picked for THIS advert only (not remembered). Consumed by
   *  lib/mobilebg/resolve.ts before the mapper runs. */
  model?: string;
};

export type MapWarning = { field: string; message: string };

export type MappedAdvert = {
  /** The exact `advertpub` body. Empty when `blockers` is non-empty. */
  params: Record<string, string>;
  /** Reasons this car must not be published at all. */
  blockers: string[];
  /** Fields omitted or inferred — shown in the preview, never fatal. */
  warnings: MapWarning[];
  /** The computed advert price in EUR, before any override. */
  computedPriceEur: number | null;
  /** The landed cost in EUR the price was derived from (markup excluded). */
  landedEur: number | null;
};

/* ------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* ------------------------------------------------------------------------- */

const lower = (v: string | null | undefined) => (v ?? "").toLowerCase().trim();

/** True when this body shape belongs under mobile.bg's topmenu=1 at all. */
export function isPublishableBody(bodyType: string | null, vehicleType: string | null): boolean {
  const vt = lower(vehicleType);
  if (vt && vt !== "automobile") return false;
  return Boolean(BODY_TO_CATEGORY[lower(bodyType)]);
}

/** „+359 898 980 011" → „0898980011" — the national form their form expects. */
function nationalPhone(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  return digits.startsWith("359") ? `0${digits.slice(3)}` : digits;
}

/**
 * „2.5L 4" → 2500 cc. Their `engine_cubature` wants whole cubic centimetres and
 * we only store a marketing engine string, so this is a DERIVED value — reported
 * as such, and dropped when the string carries no litre figure.
 */
function cubatureFromEngine(engine: string | null): number | null {
  const m = (engine ?? "").match(/(\d\.\d)\s*L/i);
  if (!m) return null;
  const litres = Number(m[1]);
  if (!Number.isFinite(litres) || litres <= 0) return null;
  return Math.round(litres * 1000);
}

/** Which auction's fee schedule applies (Copart vs IAAI) — Copart is the default. */
function auctionOf(domainName: string | null): UsAuction {
  return lower(domainName) === "iaai_com" ? "iaai" : "copart";
}

/**
 * Which market's cost model applies. The accepted country spellings mirror
 * `deriveSourceCountry` in lib/car-detail-mapper.ts ("canada" / "can" / "ca"),
 * which is what the car page's calculator keys on — so an advert prices a
 * Canadian lot exactly as the car page does.
 */
export function mobilebgMarket(
  domainName: string | null,
  locationCountry: string | null,
): "us" | "ca" | "kr" {
  if (lower(domainName) === "encar_com") return "kr";
  const country = lower(locationCountry);
  return country === "canada" || country === "can" || country === "ca" ? "ca" : "us";
}

function marketOf(source: MobilebgCarSource): "us" | "ca" | "kr" {
  return mobilebgMarket(source.domainName, source.locationCountry);
}

/** True when the lot carries real damage (not just wear) or does not run. */
function isDamaged(source: MobilebgCarSource): boolean {
  if (NON_RUNNING_CONDITIONS.has(lower(source.condition))) return true;
  const dmg = lower(source.damageMain);
  return Boolean(dmg) && !BENIGN_DAMAGE.has(dmg);
}

/**
 * The advert description. Everything here is a fact we hold — damage, document
 * title, odometer, lot reference — plus the one disclosure that makes the price
 * honest: it is an imported car and the figure already contains duty, VAT and
 * transport to Bulgaria.
 */
function buildExtinfo(source: MobilebgCarSource, damaged: boolean, priceIsLanded: boolean): string {
  const lines: string[] = [];

  const market = marketOf(source);
  const country = market === "kr" ? "Корея" : market === "ca" ? "Канада" : "САЩ";
  // "Everything included" is a factual claim, so it is made only when the
  // published figure really IS the computed landed total — never for a
  // hand-typed price or „Цена при запитване“ (Общи условия I.12).
  lines.push(
    `Автомобилът се внася по поръчка от ${country}.` +
      (priceIsLanded ? " Цената е крайна за България и включва транспорт, мито, ДДС и всички такси." : ""),
  );

  if (damaged) {
    const dmg = damageLabel(source.damageMain);
    lines.push(dmg ? `Състояние: увреден автомобил — ${dmg.toLowerCase()}.` : "Състояние: увреден автомобил.");
  }

  const doc = titleDocLabel(source.titleDoc);
  if (doc) lines.push(`Документ: ${doc}.`);
  if (source.vin) lines.push(`VIN: ${source.vin}`);
  if (source.lotNumber) lines.push(`Лот №: ${source.lotNumber}`);

  // Nothing about US here — no link to our site, no service pitch. mobile.bg's
  // terms (II.7) forbid dealers putting anything not about the car itself into
  // the description; self-promotion belongs in „Представяне на дилъра“, and an
  // advert breaking the terms is deleted without compensation (I.10). The car's
  // page already goes in the dedicated `http` field, which exists for that.

  return lines.join("\n");
}

/**
 * `extri` values we can assert from data we actually hold. Deliberately short:
 * their list has 96 features (кожен салон, парктроник, 7 места …) and we hold
 * almost none of them for a US salvage lot, so the rest is left to the admin's
 * override rather than filled with optimistic defaults.
 */
function buildExtri(source: MobilebgCarSource, damaged: boolean): string[] {
  const out = new Set<string>(["Нов внос"]);
  if (lower(source.driveWheel) === "all") out.add("4x4");
  if (damaged) out.add("Катастрофирал");
  const fuel = lower(source.fuelType);
  if (fuel === "cng") out.add("Метанова уредба");
  if (fuel === "lpg" || fuel === "gas") out.add("Газова уредба");
  return [...out];
}

/* ------------------------------------------------------------------------- */
/* The mapper                                                                 */
/* ------------------------------------------------------------------------- */

/**
 * Build the advert. Pure — no I/O, no DB, no clock — so the admin preview and
 * the publish action produce byte-identical params from the same inputs, which
 * is what makes `payload_hash` a meaningful change check.
 */
export function buildAdvertParams(args: {
  source: MobilebgCarSource;
  mapping: MobilebgMapping;
  config: CalcConfig;
  overrides?: MobilebgOverrides;
}): MappedAdvert {
  const { source, mapping, config } = args;
  const overrides = args.overrides ?? {};
  const blockers: string[] = [];
  const warnings: MapWarning[] = [];

  /* ── Blockers: reasons this car must never reach mobile.bg ───────────────── */

  if (!isPublishableBody(source.bodyType, source.vehicleType)) {
    blockers.push(
      "Автомобилът не е лек автомобил или джип — mobile.bg го класифицира в друга основна категория (Бусове, Камиони, Мотоциклети).",
    );
  }
  if (!mapping.marka) {
    blockers.push(
      `Марката „${source.brandName ?? "—"}“ не е разпозната в mobile.bg — изберете я по-горе, в „Марка и модел в mobile.bg“.`,
    );
  } else if (!mapping.model) {
    blockers.push(
      `Моделът „${source.modelName ?? "—"}“ не е разпознат в mobile.bg — изберете го по-горе, в „Марка и модел в mobile.bg“.`,
    );
  }
  if (!source.year) blockers.push("Липсва година на производство.");
  if (source.images.length === 0) blockers.push("Няма нито една снимка за обявата.");
  if (source.isArchived) {
    blockers.push("Лотът е приключил (архивиран) — автомобилът вече не е наличен за поръчка.");
  }

  /* ── Price ───────────────────────────────────────────────────────────────── */

  let landedEur: number | null = null;
  let computedPriceEur: number | null = null;

  const market = marketOf(source);
  if (source.priceUsd && source.priceUsd > 0 && market === "us" && !source.usTransport) {
    // Fail closed, exactly like the site's own calculator offer: a US total
    // without the yard's inland + container leg is ~$1,700-3,800 short (see
    // create-calculator-offer.mutation.ts), and the description would then
    // promise a price that "includes transport".
    warnings.push({
      field: "price",
      message:
        "Складът на лота не е в транспортната тарифа, затова транспортът до Холандия не може да се изчисли. Въведете цената ръчно или публикувайте „при запитване“.",
    });
  } else if (source.priceUsd && source.priceUsd > 0) {
    const breakdown = computeImportBreakdown(
      {
        market,
        vehicleType: calcVehicleTypeFromBody(source.bodyType, source.vehicleType),
        priceUsd: source.priceUsd,
        auction: auctionOf(source.domainName),
        usInlandUsd: source.usTransport?.inland,
        usContainerUsd: source.usTransport?.container,
        caFromBc: source.caFromBc,
      },
      config,
    );
    landedEur = Math.round(breakdown.totalUsd / config.eurUsd);
    computedPriceEur = Math.round(landedEur * (1 + config.mobilebgMarkupPct / 100));

    if (!source.hasBuyNow) {
      warnings.push({
        field: "price",
        message: "Лотът няма „Купи сега“ — цената е изчислена от текущата наддавана сума и ще се промени.",
      });
    }
  } else {
    warnings.push({ field: "price", message: "Липсва цена на лота — обявата ще е „Цена при запитване“." });
  }

  // A manual price must win even when the lot itself carries none — that is the
  // exact case an admin overrides (an auction with no buy-now, or a figure they
  // negotiated). Only an explicit tick, or having no number from either source,
  // falls back to „Цена при запитване".
  const finalPriceEur = overrides.priceEur ?? computedPriceEur;
  const priceOnRequest = overrides.priceOnRequest === true || finalPriceEur === null;

  if (blockers.length > 0) {
    return { params: {}, blockers, warnings, computedPriceEur, landedEur };
  }

  /* ── The payload ─────────────────────────────────────────────────────────── */

  const damaged = isDamaged(source);
  const priceIsLanded =
    !priceOnRequest && overrides.priceEur === undefined && computedPriceEur !== null;
  const params: Record<string, string> = {
    topmenu: "1",
    rub: "1",
    marka: mapping.marka!,
    model: mapping.model!,
    year: String(source.year),
    nup: damaged ? "3" : "0",
    term: overrides.term ?? "35",
    locat: BUSINESS.city,
    phone: nationalPhone(CONTACT.phone),
    email: CONTACT.email,
    http: `${SITE_URL}/avtomobil/${source.carId}`,
    extinfo: overrides.extinfo ?? buildExtinfo(source, damaged, priceIsLanded),
  };

  // „Цена при запитване" is their documented `price=&priceneg=1` pair — the
  // empty price is required, not an omission.
  if (priceOnRequest || finalPriceEur === null) {
    params.price = "";
    params.priceneg = "1";
  } else {
    params.price = String(Math.round(finalPriceEur));
    params.currency = "EUR";
  }

  const category = BODY_TO_CATEGORY[lower(source.bodyType)];
  if (category) params.category = category;

  const engineType = FUEL_TO_ENGINE_TYPE[lower(source.fuelType)];
  if (engineType) {
    params.engine_type = engineType;
    if (lower(source.fuelType) === "flexible") {
      warnings.push({
        field: "engine_type",
        message: "Flex-fuel няма отделна стойност в mobile.bg — обявено е като „Бензинов“.",
      });
    }
  } else {
    warnings.push({
      field: "engine_type",
      message: `Типът гориво „${source.fuelType ?? "—"}“ няма съответствие — полето е пропуснато.`,
    });
  }

  const transmission = TRANSMISSION_TO_MOBILEBG[lower(source.transmission)];
  if (transmission) params.transmission = transmission;
  else warnings.push({ field: "transmission", message: "Липсва скоростна кутия — полето е пропуснато." });

  const color = COLOR_TO_MOBILEBG[lower(source.color)];
  if (color) params.color = color;
  else if (source.color) {
    warnings.push({
      field: "color",
      message: `Цветът „${source.color}“ няма съответствие в mobile.bg — полето е пропуснато.`,
    });
  }

  if (source.odometerKm !== null && source.odometerKm > 0) {
    params.km = String(Math.round(source.odometerKm));
  } else {
    warnings.push({ field: "km", message: "Липсва пробег." });
  }

  if (source.vin) params.vin = source.vin;

  if (source.hp && source.hp > 0) params.engine_power = String(Math.round(source.hp));
  else warnings.push({ field: "engine_power", message: "Липсва мощност." });

  const cubature = cubatureFromEngine(source.engine);
  if (cubature) {
    params.engine_cubature = String(cubature);
    warnings.push({
      field: "engine_cubature",
      message: `Кубатурата е изведена от „${source.engine}“ (${cubature} куб.см) — проверете преди публикуване.`,
    });
  }

  if (source.engine) params.modification = source.engine;

  // Production month: we store only the year. Their `month` + `year` form one
  // date control, so leaving it out may be rejected — the admin fills it in.
  if (overrides.month) params.month = overrides.month;
  else warnings.push({ field: "month", message: "Не съхраняваме месец на производство — изберете го ръчно." });

  // Their dependent city list came back empty on every unauthenticated probe.
  if (overrides.locatc) params.locatc = overrides.locatc;
  else {
    warnings.push({
      field: "locatc",
      message: "Списъкът с градове (locatc) е празен без оторизация — изберете града ръчно след активиране на акаунта.",
    });
  }

  const extri = [...buildExtri(source, damaged), ...(overrides.extri ?? [])];
  if (extri.length > 0) params.extri = [...new Set(extri)].join("~");

  warnings.push({
    field: "extri",
    message:
      "Екстрите се извеждат само от данните, които пазим (задвижване, гориво, състояние). Добавете останалите ръчно.",
  });

  return { params, blockers, warnings, computedPriceEur, landedEur };
}

/**
 * A stable hash of the param set, used as `mobilebg_adverts.payload_hash` so a
 * re-publish can skip an unchanged car. Key order is normalised because
 * `Record` iteration order would otherwise make an identical advert hash
 * differently.
 */
export function hashParams(params: Record<string, string>): string {
  const canonical = Object.keys(params)
    .sort()
    .map((k) => `${k}=${params[k]}`)
    .join("&");

  // FNV-1a — no crypto import needed for a change-detection key.
  let h = 0x811c9dc5;
  for (let i = 0; i < canonical.length; i++) {
    h ^= canonical.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, "0");
}
