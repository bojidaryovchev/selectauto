/**
 * Bulgarian display labels for the canonical (English/code) values stored in
 * `car_listings`. Translation happens HERE, at render — we store raw canonical
 * values in the DB (so facets group correctly and re-labelling never needs a
 * backfill) and localize on the way out. See apps/web/ALL-CARS-DB-DESIGN.md §1a.
 *
 * The enum maps (status/condition/drive/transmission/color) are COMPLETE against
 * the AuctionsAPI enum tables (verified): every possible value has a label, with
 * a sensible fallback for NULL/unknown. `damage` is large free-text — the head is
 * mapped, the long tail passes through. `engine`/`title`/`seller`/`lot_number`
 * are NOT translated (specs / proper nouns) — render verbatim.
 */

const UNKNOWN = "Неизвестно";

/** Lowercase-key lookup with a fallback (canonical values are lowercase). */
function lookup(map: Record<string, string>, value: string | null | undefined, fallback = UNKNOWN): string {
  if (value == null || value === "") return fallback;
  return map[value.toLowerCase()] ?? fallback;
}

/** auction_lots.status → BG status pill. Full PriceStatusEnum (8 values). */
const STATUS_BG: Record<string, string> = {
  sale: "Наличен",
  upcoming: "Предстои",
  future: "Предстои",
  on_approval: "Очаква одобрение",
  new_auction: "Нов търг",
  sold: "Продаден",
  failed: "Неуспешен",
  not_sold: "Непродаден",
  not_on_sale: "Не се продава",
  not_checked: "Непроверен",
};
export const statusLabel = (v: string | null | undefined) => lookup(STATUS_BG, v, "Неизвестен");

/** Whether a status is an active/biddable one (drives countdown vs ended UI). */
const ACTIVE_STATUSES = new Set(["sale", "upcoming", "future", "on_approval", "new_auction"]);
export const isActiveStatus = (v: string | null | undefined) => (v ? ACTIVE_STATUSES.has(v.toLowerCase()) : false);

/** auction_lots.condition → BG. Full ConditionEnum (8 values). */
const CONDITION_BG: Record<string, string> = {
  run_and_drives: "Пали и се движи",
  engine_starts: "Пали и се движи",
  for_repair: "За ремонт",
  to_be_dismantled: "За части",
  not_run: "Не пали",
  used: "Употребяван",
  unconfirmed: "Непотвърдено",
  enhanced: "Подобрено",
};
export const conditionLabel = (v: string | null | undefined) => lookup(CONDITION_BG, v, "");

/** cars.drive_wheel → BG. Full DriveWheelEnum (3 values). */
const DRIVE_BG: Record<string, string> = {
  front: "Предно",
  all: "4x4",
  rear: "Задно",
};
export const driveLabel = (v: string | null | undefined) => lookup(DRIVE_BG, v, "");

/** cars.transmission → BG. Full TransmissionEnum (2 values). */
const TRANSMISSION_BG: Record<string, string> = {
  automatic: "Автоматична",
  manual: "Ръчна",
};
export const transmissionLabel = (v: string | null | undefined) => lookup(TRANSMISSION_BG, v, "");

/** cars.color → BG. Full ColorEnum (19 values) — for the color facet dropdown. */
export const COLOR_BG: Record<string, string> = {
  silver: "Сребрист",
  purple: "Лилав",
  orange: "Оранжев",
  green: "Зелен",
  red: "Червен",
  gold: "Златист",
  charcoal: "Графитен",
  brown: "Кафяв",
  grey: "Сив",
  turquoise: "Тюркоазен",
  blue: "Син",
  bronze: "Бронзов",
  white: "Бял",
  cream: "Кремав",
  black: "Черен",
  yellow: "Жълт",
  beige: "Бежов",
  pink: "Розов",
  two_colors: "Двуцветен",
};
export const colorLabel = (v: string | null | undefined) => lookup(COLOR_BG, v, v ?? "");

/**
 * auction_lots.damage_main → BG. Large free-text (2,393 distinct), but a fat head
 * covers most rows. Map the common ones; UNMAPPED values pass through verbatim
 * (don't blank them). Grow this map by frequency over time.
 */
const DAMAGE_BG: Record<string, string> = {
  "front end": "Предна част",
  "rear end": "Задна част",
  side: "Странична",
  "normal wear & tear": "Нормално износване",
  "normal wear": "Нормално износване",
  rear: "Задна",
  front: "Предна",
  hail: "Градушка",
  "left side": "Лява страна",
  "right side": "Дясна страна",
  "right front": "Предна дясна",
  "left front": "Предна лява",
  "right rear": "Задна дясна",
  "left rear": "Задна лява",
  "front & rear": "Предна и задна",
  "minor dent/scratches": "Леки щети/драскотини",
  rollover: "Преобръщане",
  unknown: "Неизвестна",
  mechanical: "Механична",
  "all over": "По цялата кола",
  undercarriage: "Долна част",
  "left & right side": "Двете страни",
  vandalism: "Вандализъм",
  "water/flood": "Вода/наводнение",
  theft: "Кражба",
  "top/roof": "Покрив",
  burn: "Изгаряне",
  "biohazard/chemical": "Биологична/химична",
  suspension: "Окачване",
  electrical: "Електрическа",
  "engine damage": "Двигател",
};
/** Returns the BG label for a known damage value, else the raw value verbatim. */
export const damageLabel = (v: string | null | undefined): string => {
  if (v == null || v === "") return "";
  return DAMAGE_BG[v.toLowerCase().trim()] ?? v;
};

/**
 * Vehicle/body TYPE → BG. The catalog's "Тип" filter is a COMBINED dimension:
 * for cars (`vehicle_type='automobile'`) we use the finer `body_type`
 * (SUV/sedan/pickup/…); for non-car categories we use `vehicle_type` directly
 * (boat/truck/moto/…). Both maps below are keyed by canonical API value.
 */

/** cars.vehicle_type → BG (the API VehicleTypeEnum; non-car categories). */
export const VEHICLE_TYPE_BG: Record<string, string> = {
  automobile: "Автомобил",
  truck: "Камион",
  motorcycle: "Мотоциклет",
  cargo_special_bus: "Бус / Товарен",
  mobile_home: "Кемпер",
  trailers: "Ремарке",
  boat: "Лодка",
  atv: "ATV",
  bus: "Автобус",
  industrial_equipment: "Индустриална техника",
  snow_mobile: "Снегоход",
  jet_sky: "Джет",
  watercraft: "Плавателен съд",
  emergency_equipment: "Спецтехника",
};

/** cars.body_type → BG (the API BodyTypeEnum; car sub-shapes). */
export const BODY_TYPE_BG: Record<string, string> = {
  suv: "Джип (SUV)",
  sedan: "Седан",
  pickup: "Пикап",
  van: "Ван",
  truck: "Камион",
  hatchback: "Хечбек",
  coupe: "Купе",
  wagon: "Комби",
  cabrio: "Кабрио",
  trailer: "Ремарке",
  roadster: "Родстер",
  limousine: "Лимузина",
  liftback: "Лифтбек",
  combi: "Комби",
  furgon: "Фургон",
  sport_car: "Спортен",
  moto: "Мотоциклет",
  sport_bike: "Спортен мотор",
  roadster_bike: "Родстер мотор",
  enduro_bike: "Ендуро",
  bike: "Мотопед",
  industrial: "Индустриален",
  bus: "Автобус",
  hearse: "Катафалка",
  fire_truck: "Пожарна",
  garbage: "Боклукчийски",
  tandem: "Тандем",
  other: "Друго",
};
export const vehicleTypeLabel = (v: string | null | undefined) => lookup(VEHICLE_TYPE_BG, v, v ?? "");
export const bodyTypeLabel = (v: string | null | undefined) => lookup(BODY_TYPE_BG, v, v ?? "");

/** auction_lots.domain_name → source badge text (auction site; keep latin). */
const SOURCE_BADGE: Record<string, string> = {
  copart_com: "COPART",
  iaai_com: "IAAI",
  encar_com: "ENCAR",
};
export const sourceBadge = (v: string | null | undefined) => (v ? (SOURCE_BADGE[v.toLowerCase()] ?? v.toUpperCase()) : "—");

/* ---------------------------------------------------------------------------
 * Detail-page-only labels. These map fields that live ONLY in the lot's
 * raw_json (not promoted to car_listings columns) and are surfaced on the
 * single-car page. Same store-canonical/translate-on-render rule as above.
 * ------------------------------------------------------------------------ */

/** raw_json.seller_type.name → BG (who is selling — insurance/dealer/…). */
const SELLER_TYPE_BG: Record<string, string> = {
  insurance: "Застраховател",
  dealer: "Дилър",
  dealership: "Дилър",
  rental: "Под наем (rental)",
  fleet: "Автопарк",
  finance: "Финансова компания",
  credit_company: "Кредитна компания",
  bank: "Банка",
  individual: "Частно лице",
  charity: "Дарение",
  government: "Държавен",
};
export const sellerTypeLabel = (v: string | null | undefined) => lookup(SELLER_TYPE_BG, v, "");

/** raw_json.auction_type.name → BG (how it sells — live/timed/buy-now/…). */
const AUCTION_TYPE_BG: Record<string, string> = {
  live: "На живо",
  timed: "Таймер",
  on_approval: "С одобрение",
  buy_now: "Купи сега",
  pure_sale: "Директна продажба",
  minimum_bid: "Минимална оферта",
};
export const auctionTypeLabel = (v: string | null | undefined) => lookup(AUCTION_TYPE_BG, v, "");

/**
 * raw_json.title.name / detailed_title.name → BG (the legal document title:
 * Salvage / Clean / Rebuilt …). Large free-text head; long tail passes through.
 */
const TITLE_DOC_BG: Record<string, string> = {
  salvage: "Salvage (тотална щета)",
  clean: "Чист талон",
  "clean title": "Чист талон",
  rebuilt: "Възстановен (rebuilt)",
  "certificate of title": "Талон за собственост",
  "non-repairable": "Невъзстановим",
  nonrepairable: "Невъзстановим",
  junk: "За скрап (junk)",
  "bill of sale": "Договор за продажба",
  "export only": "Само за износ",
  "parts only": "Само за части",
  "flood": "Наводнение",
  "certificate of destruction": "За унищожаване",
};
export const titleDocLabel = (v: string | null | undefined): string => {
  if (v == null || v === "") return "";
  const key = v.toLowerCase().trim();
  // Match on a known prefix too ("Salvage (Colorado)" → "Salvage …").
  for (const [k, label] of Object.entries(TITLE_DOC_BG)) {
    if (key === k || key.startsWith(`${k} `) || key.startsWith(`${k}(`)) return label;
  }
  return v;
};

/** keys_available boolean → BG ("С ключове" / "Без ключове"). */
export const keysLabel = (v: boolean | null | undefined): string =>
  v === true ? "Да" : v === false ? "Не" : "";

/** raw_json.airbags.name → BG (intact / deployed). */
const AIRBAGS_BG: Record<string, string> = {
  intact: "Налични",
  deployed: "Сработили",
  not_deployed: "Не са сработили",
  missing: "Липсват",
};
export const airbagsLabel = (v: string | null | undefined) => lookup(AIRBAGS_BG, v, "");

/** cars.fuel_type → BG. */
const FUEL_BG: Record<string, string> = {
  gasoline: "Бензин",
  petrol: "Бензин",
  diesel: "Дизел",
  hybrid: "Хибрид",
  electric: "Електрически",
  flexible: "Flex-fuel",
  gas: "Газ",
  lpg: "Газ (LPG)",
  cng: "Метан (CNG)",
  hydrogen: "Водород",
};
export const fuelLabel = (v: string | null | undefined) => lookup(FUEL_BG, v, v ?? "");
