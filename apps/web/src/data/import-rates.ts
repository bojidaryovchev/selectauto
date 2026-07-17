/**
 * Regulatory rates + market defaults for the import-cost calculator
 * (Calculator v2 — the single source the quarterly re-verification loop updates;
 * docs/12-web-seo-strategy.md §3.9 has the verified facts + primary sources).
 *
 * Everything here is an ESTIMATE DEFAULT presented transparently to the user,
 * except the legal rates (duty %, VAT %, ecotax bands, EUR/BGN), which are the
 * in-force figures as of `RATES_VERIFIED_AT`. When re-verifying: customs.bg
 * (duty/VAT), ПМС 76/2016 изм. (екотакса — a ~24% increase was DRAFTED mid-2025;
 * promulgation in Държавен вестник unconfirmed as of the stamp date), EU–KR FTA
 * origin rules (trade.ec.europa.eu), transit times (Red Sea/Cape routing status).
 */

/** Shown on the calculator ("Ставките са проверени към …") — update on re-verification. */
export const RATES_VERIFIED_AT = "15.07.2026";

/** Irrevocable BGN conversion rate (Bulgaria adopted the euro on 2026-01-01). */
export const EUR_BGN = 1.95583;

/**
 * Approximate USD per 1 EUR, for converting the site's auction prices (all USD —
 * see car-detail-mapper's `eur()` formatting "16 743 $") into the calculator's
 * EUR price field when deep-linking from a listing. Same fixed-rate pattern as
 * `KRW_PER_USD` in constants: a rough magnitude is all an estimate needs — the
 * result is labeled ориентировъчен. Refresh occasionally as the rate drifts.
 */
export const USD_PER_EUR = 1.08;

/** Standard (MFN) EU import duty for passenger cars (HS 8703), % of customs value. */
export const DUTY_PCT = 10;

/** Bulgarian VAT on import, % of (customs value + duty). */
export const VAT_PCT = 20;

/**
 * Declared customs value as a % of the full CIF, used as the base duty + VAT are
 * charged on. **Defaults to 100 (the legally correct full transaction value.)**
 * Exposed as an editable field so a user with a specific, documented basis for a
 * lower declared value (e.g. a salvage/damaged valuation) can model it — the safe
 * default taxes the full value. Lowering it only shrinks the tax base; the car,
 * fees and transport are still paid (and counted) in full.
 */
export const DEFAULT_CUSTOMS_BASE_PCT = 100;

/** Clamp a customs-base % to the sane 1–100 range (100 = full value). */
export function clampCustomsBasePct(v: number | undefined): number {
  if (v === undefined || !Number.isFinite(v)) return DEFAULT_CUSTOMS_BASE_PCT;
  return Math.min(100, Math.max(1, Math.round(v)));
}

/**
 * Екотакса (продуктова такса МПС, ПУДООС) in BGN by vehicle age band — the
 * in-force M1 rates per ПМС 76/2016 (изм. ДВ 60/2018). EVs: the ordinance
 * defines a fee only for NEW EVs (102 лв) — used EVs have no defined fee, shown
 * as 0 with the caveat in the calculator copy.
 */
export const ECOTAX_BGN = {
  ice: { new: 125, upTo5: 194, from5to10: 290, over10: 310 },
  hybrid: { new: 100, upTo5: 170, from5to10: 240, over10: 255 },
  ev: { new: 102, upTo5: 0, from5to10: 0, over10: 0 },
} as const;

export type FuelKind = keyof typeof ECOTAX_BGN;
export type AgeBand = keyof (typeof ECOTAX_BGN)["ice"];

export const AGE_BANDS: { id: AgeBand; label: string }[] = [
  { id: "new", label: "Ново (0 км)" },
  { id: "upTo5", label: "До 5 г." },
  { id: "from5to10", label: "5–10 г." },
  { id: "over10", label: "Над 10 г." },
];

export const FUEL_KINDS: { id: FuelKind; label: string }[] = [
  { id: "ice", label: "Бензин / Дизел" },
  { id: "hybrid", label: "Хибрид" },
  { id: "ev", label: "Електрически" },
];

/** Екотакса in EUR (fixed conversion), rounded to whole euro. */
export function ecotaxEur(fuel: FuelKind, age: AgeBand): number {
  return Math.round(ECOTAX_BGN[fuel][age] / EUR_BGN);
}

/**
 * Per-market calculator defaults. All EUR, all user-editable in the UI except
 * `duty` behavior:
 *  - `kr`: 0% duty ONLY with an origin declaration from a Korean approved
 *    exporter (EU–KR FTA; mandatory for consignments over €6,000 — no
 *    importer's-knowledge route). Without it: the full 10% MFN. The calculator
 *    exposes this as a toggle.
 *  - `us`: 10% MFN, no preferential route.
 *  - `ca`: 10% in practice — CETA's 0% applies only to CANADIAN-ORIGIN cars,
 *    and most Canadian-auction inventory is US-built (no toggle: the exception
 *    is rare enough that a personal offer handles it).
 *
 * `approval` covers индивидуално одобряване (ИААА, ~€256–511) + технотест +
 * typical adaptation; higher for US/CA (ECE headlights, rear fog, km/h
 * speedometer). `registration` covers ГТП + КАТ такси + номера.
 * `transit` is the honest door-to-door figure for 2026 (Korea rides the Cape of
 * Good Hope detour — competitors quoting „30–45 дни" are stale).
 */
export const MARKETS = [
  {
    id: "kr",
    label: "Корея",
    transport: 1800,
    auctionFees: 900,
    approval: 400,
    registration: 100,
    transit: "≈ 8–10 седмици",
    originToggle: true,
  },
  {
    id: "us",
    label: "САЩ",
    transport: 2200,
    auctionFees: 900,
    approval: 550,
    registration: 100,
    transit: "≈ 4–7 седмици",
    originToggle: false,
  },
  {
    id: "ca",
    label: "Канада",
    transport: 2300,
    auctionFees: 900,
    approval: 550,
    registration: 100,
    transit: "≈ 5–8 седмици",
    originToggle: false,
  },
] as const;

export type MarketId = (typeof MARKETS)[number]["id"];

/** Type guard for URL/DB values ("kr" | "us" | "ca"). */
export function isMarketId(v: unknown): v is MarketId {
  return v === "kr" || v === "us" || v === "ca";
}

/* ---------------------------------------------------------------------------
 * Breakdown computation — ONE pure function shared by the client estimator and
 * the server action (the action recomputes from the raw inputs instead of
 * trusting client-sent line items), so the email always matches the UI.
 * ------------------------------------------------------------------------ */

export type ImportCostInputs = {
  market: MarketId;
  priceEur: number;
  auctionFeesEur: number;
  transportEur: number;
  approvalEur: number;
  registrationEur: number;
  fuel: FuelKind;
  age: AgeBand;
  /** Korea only: the exporter provides an approved-exporter origin declaration → 0% duty. */
  originDeclaration: boolean;
  /**
   * Declared customs value as a % of CIF (the base for duty + VAT). Optional;
   * defaults to `DEFAULT_CUSTOMS_BASE_PCT` (100 = full value) when omitted.
   */
  customsBasePct?: number;
};

export type ImportCostLine = { label: string; amountEur: number };

export type ImportCostBreakdown = {
  /** Ordered line items (incl. the car price) — what the UI and the email render. */
  lines: ImportCostLine[];
  cifEur: number;
  /** The value duty + VAT were actually charged on (CIF × customsBasePct). */
  customsValueEur: number;
  /** The applied customs-base %, clamped to 1–100 (100 = full value). */
  customsBasePctApplied: number;
  dutyPctApplied: number;
  dutyEur: number;
  vatEur: number;
  ecotaxEur: number;
  totalEur: number;
};

export function computeImportBreakdown(i: ImportCostInputs): ImportCostBreakdown {
  // Full landed value (CIF): price paid + auction fees + transport to the EU/BG.
  // This is always paid in full and counted in the total.
  const cif = i.priceEur + i.auctionFeesEur + i.transportEur;
  // Declared customs value: the base duty + VAT are charged on. Defaults to the
  // full CIF (100%); the UI exposes it as an editable field.
  const customsBasePct = clampCustomsBasePct(i.customsBasePct);
  const customsValue = Math.round((cif * customsBasePct) / 100);
  // Duty: Korea reaches 0% ONLY with the origin declaration (EU–KR FTA); USA is
  // 10% MFN; Canada is 10% in practice (CETA needs Canadian ORIGIN — rare on
  // auction inventory, handled via a personal offer, not a toggle).
  const dutyPct = i.market === "kr" && i.originDeclaration ? 0 : DUTY_PCT;
  const duty = Math.round((customsValue * dutyPct) / 100);
  const vat = Math.round(((customsValue + duty) * VAT_PCT) / 100);
  const ecotax = ecotaxEur(i.fuel, i.age);
  const total = cif + duty + vat + ecotax + i.approvalEur + i.registrationEur;

  const lines: ImportCostLine[] = [
    { label: "Цена на автомобила", amountEur: i.priceEur },
    { label: "Аукционни такси", amountEur: i.auctionFeesEur },
    { label: "Транспорт до България", amountEur: i.transportEur },
    { label: `Мито (${dutyPct}%)`, amountEur: duty },
    { label: `ДДС (${VAT_PCT}%)`, amountEur: vat },
    { label: "Екотакса (ПУДООС)", amountEur: ecotax },
    { label: "Одобряване, технотест и адаптация", amountEur: i.approvalEur },
    { label: "Регистрация (ГТП, КАТ, номера)", amountEur: i.registrationEur },
  ];

  return {
    lines,
    cifEur: cif,
    customsValueEur: customsValue,
    customsBasePctApplied: customsBasePct,
    dutyPctApplied: dutyPct,
    dutyEur: duty,
    vatEur: vat,
    ecotaxEur: ecotax,
    totalEur: total,
  };
}
