/**
 * Import-cost calculator v4 — USD throughout, with all tunable numbers extracted
 * into an admin-editable `CalcConfig`.
 *
 * `DEFAULT_CALC_CONFIG` holds the owner's dictated values (the fallback + the
 * seed the admin form starts from). At runtime the active config comes from the
 * DB (`getCalcConfig`, table `calculator_settings`) — the server passes it to
 * `computeImportBreakdown`, and the client fetches `/api/calc-config` (falling
 * back to `DEFAULT_CALC_CONFIG` instantly, since it's tiny). Every money figure
 * flows from the config, so the /admin/tarifi form can change them with no deploy.
 *
 * Market models (unchanged):
 *  - 🇰🇷 Korea: price + commission (tiered) + transport + duty (0% with EU–KR
 *    origin declaration, else duty%) + VAT + optional technotest.
 *  - 🇺🇸 USA: [price + auction fee (tiered) + fixed fees + inland + container] to
 *    Holland → customs value (editable %) → duty + VAT + agency + BG transport +
 *    optional technotest.
 *  - 🇨🇦 Canada: same as USA, flat transport.
 */

/** Shown on the calculator ("Ставките са проверени към …"). */
export const RATES_VERIFIED_AT = "17.07.2026";

export type MarketId = "kr" | "us" | "ca";
export type VehicleType = "sedan" | "suv";
export type UsAuction = "copart" | "iaai";

/** One Korea commission bracket: price ≤ maxPriceEur → commissionEur. */
export type CommissionTier = { maxPriceEur: number; commissionEur: number };

/** Every admin-tunable number in one object (persisted in `calculator_settings`). */
export type CalcConfig = {
  /** Fixed USD per 1 EUR — converts the EUR-quoted fees to USD (estimate). */
  eurUsd: number;
  /** EU import duty %, passenger cars (Korea reaches 0% with origin declaration). */
  dutyPct: number;
  /** Bulgarian VAT % on import. */
  vatPct: number;
  /** Korea transport to the EU, EUR, by vehicle type. */
  krTransportEur: { sedan: number; suv: number };
  /** Korea mediation commission brackets (EUR) + cap for prices above the top bracket. */
  commissionTiers: CommissionTier[];
  commissionCapEur: number;
  /** US/CA auction fee: flat below/at threshold, else % of price by auction. */
  usAuctionFlatUsd: number;
  usAuctionThresholdUsd: number;
  usAuctionPct: { copart: number; iaai: number };
  /** US/CA fixed fees (USD). */
  usFixedFeesUsd: { title: number; environmental: number; reinvoicing: number; onlineBid: number };
  /** Canada flat transport to the EU (USD). */
  caTransportUsd: number;
  /** US/CA customs-agency fee (EUR). */
  agencyEur: number;
  /** US/CA Holland→Bulgaria transport (EUR) by vehicle type. */
  bgTransportEur: { sedan: number; suv: number };
  /** Optional технотест (EUR). */
  technotestEur: number;
};

/** The owner's dictated defaults — fallback + the form's starting values. */
export const DEFAULT_CALC_CONFIG: CalcConfig = {
  eurUsd: 1.08,
  dutyPct: 10,
  vatPct: 20,
  krTransportEur: { sedan: 1630, suv: 1780 },
  commissionTiers: [
    { maxPriceEur: 10000, commissionEur: 800 },
    { maxPriceEur: 15000, commissionEur: 1200 },
    { maxPriceEur: 20000, commissionEur: 1400 },
    { maxPriceEur: 25000, commissionEur: 1600 },
    { maxPriceEur: 30000, commissionEur: 1800 },
    { maxPriceEur: 35000, commissionEur: 2000 },
    { maxPriceEur: 40000, commissionEur: 2200 },
    { maxPriceEur: 45000, commissionEur: 2400 },
    { maxPriceEur: 50000, commissionEur: 2600 },
  ],
  commissionCapEur: 3000,
  usAuctionFlatUsd: 780,
  usAuctionThresholdUsd: 10000,
  usAuctionPct: { copart: 0.075, iaai: 0.085 },
  usFixedFeesUsd: { title: 25, environmental: 95, reinvoicing: 130, onlineBid: 115 },
  caTransportUsd: 1830,
  agencyEur: 550,
  bgTransportEur: { sedan: 1250, suv: 1350 },
  technotestEur: 350,
};

export const MARKETS: { id: MarketId; label: string; transit: string; originToggle: boolean }[] = [
  { id: "kr", label: "Корея", transit: "≈ 8–10 седмици", originToggle: true },
  { id: "us", label: "САЩ", transit: "≈ 4–7 седмици", originToggle: false },
  { id: "ca", label: "Канада", transit: "≈ 5–8 седмици", originToggle: false },
];

export function isMarketId(v: unknown): v is MarketId {
  return v === "kr" || v === "us" || v === "ca";
}

/**
 * Body types (cars.body_type / BodyTypeEnum, see lib/car-labels.ts) whose
 * height/size puts them in the larger container-transport bucket. The calculator
 * offers only a two-way Седан vs Джип/SUV choice — a proxy for the vehicle's
 * shipping footprint, which sets the KR/BG transport figures and the US container
 * tariff lookup — so tall/large bodies map to "suv" and everything else to "sedan".
 */
const SUV_BODY_TYPES = new Set(["suv", "pickup", "van", "furgon", "truck"]);

/**
 * Map a car's raw body/vehicle type to the calculator's `VehicleType` bucket.
 * Used to pre-seed the per-listing calculator from THIS car's details. Anything
 * not clearly large (or unknown) defaults to "sedan" — the conservative, smaller
 * transport figure.
 */
export function calcVehicleTypeFromBody(
  bodyType?: string | null,
  vehicleType?: string | null,
): VehicleType {
  const body = bodyType?.toLowerCase();
  if (body && SUV_BODY_TYPES.has(body)) return "suv";
  // A non-automobile `vehicle_type` of "truck" is a large body even when the
  // finer `body_type` is absent.
  if (vehicleType?.toLowerCase() === "truck") return "suv";
  return "sedan";
}

/** Convert EUR → whole USD at the config's fixed rate. */
export function usd(eur: number, eurUsd: number): number {
  return Math.round(eur * eurUsd);
}

/**
 * Korea commission (USD-agnostic; EUR in/out): first bracket whose `maxPriceEur`
 * covers the price, else the cap for prices above the top bracket.
 */
export function commissionEur(priceEur: number, config: CalcConfig): number {
  for (const tier of config.commissionTiers) {
    if (priceEur <= tier.maxPriceEur) return tier.commissionEur;
  }
  return config.commissionCapEur;
}

/** US/Canada auction fee, USD. */
export function usAuctionFeeUsd(priceUsd: number, auction: UsAuction, config: CalcConfig): number {
  if (priceUsd <= config.usAuctionThresholdUsd) return config.usAuctionFlatUsd;
  return Math.round(priceUsd * config.usAuctionPct[auction]);
}

/** Declared customs value as % of the taxable base; 100 = full value (default). */
export const DEFAULT_CUSTOMS_BASE_PCT = 100;

export function clampCustomsBasePct(v: number | undefined): number {
  if (v === undefined || !Number.isFinite(v)) return DEFAULT_CUSTOMS_BASE_PCT;
  return Math.min(100, Math.max(1, Math.round(v)));
}

export type ImportCostInputs = {
  market: MarketId;
  vehicleType: VehicleType;
  priceUsd: number;
  customsBasePct?: number;
  technotest?: boolean;
  originDeclaration?: boolean;
  auction?: UsAuction;
  location?: string;
  usInlandUsd?: number;
  usContainerUsd?: number;
};

export type ImportCostLine = { label: string; amountUsd: number; muted?: boolean };

export type ImportCostBreakdown = {
  lines: ImportCostLine[];
  customsValueUsd: number;
  customsBasePctApplied: number;
  dutyPctApplied: number;
  dutyUsd: number;
  vatUsd: number;
  totalUsd: number;
};

/**
 * The pure cost model shared by the client estimator and the server action. All
 * amounts USD. `config` defaults to `DEFAULT_CALC_CONFIG`; callers pass the active
 * DB config. For US, the caller resolves inland/container and passes them in.
 */
export function computeImportBreakdown(
  i: ImportCostInputs,
  config: CalcConfig = DEFAULT_CALC_CONFIG,
): ImportCostBreakdown {
  const basePct = clampCustomsBasePct(i.customsBasePct);
  const tech = i.technotest ? usd(config.technotestEur, config.eurUsd) : 0;
  const { dutyPct, vatPct } = config;

  if (i.market === "kr") {
    const transport = usd(config.krTransportEur[i.vehicleType], config.eurUsd);
    const commission = usd(commissionEur(i.priceUsd / config.eurUsd, config), config.eurUsd);
    const taxable = i.priceUsd + transport;
    const customsValue = Math.round((taxable * basePct) / 100);
    const appliedDuty = i.originDeclaration ? 0 : dutyPct;
    const duty = Math.round((customsValue * appliedDuty) / 100);
    const vat = Math.round(((customsValue + duty) * vatPct) / 100);
    const total = i.priceUsd + commission + transport + duty + vat + tech;

    const lines: ImportCostLine[] = [
      { label: "Цена на автомобила", amountUsd: i.priceUsd },
      { label: "Комисионна (нашата услуга)", amountUsd: commission },
      { label: "Транспорт до ЕС", amountUsd: transport },
      { label: `Мито (${appliedDuty}%)`, amountUsd: duty },
      { label: `ДДС (${vatPct}%)`, amountUsd: vat },
    ];
    if (tech) lines.push({ label: "Технотест (по желание)", amountUsd: tech });
    if (basePct < 100)
      lines.push({ label: `Митническа основа (${basePct}%)`, amountUsd: customsValue, muted: true });

    return {
      lines,
      customsValueUsd: customsValue,
      customsBasePctApplied: basePct,
      dutyPctApplied: appliedDuty,
      dutyUsd: duty,
      vatUsd: vat,
      totalUsd: total,
    };
  }

  // US / Canada
  const auction: UsAuction = i.auction ?? "copart";
  const auctionFee = usAuctionFeeUsd(i.priceUsd, auction, config);
  const f = config.usFixedFeesUsd;
  const fixed = f.title + f.environmental + f.reinvoicing + f.onlineBid;

  const lines: ImportCostLine[] = [
    { label: "Цена на автомобила", amountUsd: i.priceUsd },
    { label: `Аукционна такса (${auction === "copart" ? "Copart" : "IAAI"})`, amountUsd: auctionFee },
    { label: "Фиксирани такси (title, еко, преиздаване, онлайн наддаване)", amountUsd: fixed },
  ];

  let transportTotal: number;
  if (i.market === "ca") {
    transportTotal = config.caTransportUsd;
    lines.push({ label: "Транспорт до ЕС", amountUsd: transportTotal });
  } else {
    const inland = i.usInlandUsd ?? 0;
    const container = i.usContainerUsd ?? 0;
    transportTotal = inland + container;
    lines.push({ label: "Вътрешен транспорт (САЩ)", amountUsd: inland });
    lines.push({ label: "Контейнерен транспорт", amountUsd: container });
  }

  const estimatedToHolland = i.priceUsd + auctionFee + fixed + transportTotal;
  lines.push({ label: "Междинна сума (до Холандия)", amountUsd: estimatedToHolland, muted: true });

  const customsValue = Math.round((estimatedToHolland * basePct) / 100);
  const duty = Math.round((customsValue * dutyPct) / 100);
  const vat = Math.round(((customsValue + duty) * vatPct) / 100);
  const agency = usd(config.agencyEur, config.eurUsd);
  const bgTransport = usd(config.bgTransportEur[i.vehicleType], config.eurUsd);

  lines.push({ label: `Мито (${dutyPct}%)`, amountUsd: duty });
  lines.push({ label: `ДДС (${vatPct}%)`, amountUsd: vat });
  lines.push({ label: "Митническо обслужване (агенция)", amountUsd: agency });
  lines.push({ label: "Транспорт до България", amountUsd: bgTransport });
  if (tech) lines.push({ label: "Технотест (по желание)", amountUsd: tech });
  if (basePct < 100)
    lines.push({ label: `Митническа основа (${basePct}%)`, amountUsd: customsValue, muted: true });

  const total = estimatedToHolland + duty + vat + agency + bgTransport + tech;

  return {
    lines,
    customsValueUsd: customsValue,
    customsBasePctApplied: basePct,
    dutyPctApplied: dutyPct,
    dutyUsd: duty,
    vatUsd: vat,
    totalUsd: total,
  };
}
