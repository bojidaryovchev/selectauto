/**
 * Shared constants for the contracts & payments module (/admin/dogovori,
 * /admin/depoziti, /admin/poluchateli — техническо задание "договори и
 * плащания", docs/contracts-payments-plan.md). Values mirror the DB columns
 * created by migration 0038; labels are Bulgarian (the whole back office is BG).
 */

/**
 * Standard payment term — the падеж defaults to this many days after the notice
 * date (owner, 07.2026). It's what makes the overdue sweep
 * (api/cron/overdue-payments) meaningful: every generated notice gets a падеж.
 */
export const DEFAULT_PAYMENT_TERM_DAYS = 10;

/**
 * Contract markets. The spec (§3.1) knew only "САЩ/Канада (USD)" and "Корея
 * (EUR)", but the owner's signed contracts and his answers (07.2026) show four
 * genuinely different shapes, so the market drives the document type, the
 * currency, the list of пера AND how many payment stages exist:
 *
 *   us — договор за посредничество, USD, 5 пера → 4 етапа
 *   ca — договор за посредничество, EUR, 4 пера → 3 етапа; перо 1 (кола +
 *        транспорт до Европа) is entered in CAD and converted with a rate fixed
 *        at contract creation (the wire goes to ALCO IMPEX in CAD)
 *   kr — договор за посредничество, EUR, 5 пера → 4 етапа
 *   eu — договор за ДОСТАВКА (купувач/доставчик, не посредничество), EUR с ДДС,
 *        3 пера → 2 етапа (търг и финално); no customs, no sea transport
 */
export const CONTRACT_MARKETS = ["us", "ca", "kr", "eu"] as const;

export type ContractMarket = (typeof CONTRACT_MARKETS)[number];

/** The contract amount columns a перо can map onto. */
export type ContractAmountKey =
  | "amountCar"
  | "amountTransport"
  | "amountCustomsVat"
  | "amountTransportEuBg"
  | "amountCommission";

export type ContractPointDef = {
  key: ContractAmountKey;
  label: string;
  /** Entered in this currency and converted to the contract currency by a rate. */
  foreignCurrency?: "CAD";
};

export type ContractStageDef = {
  stage: PaymentStage;
  /** Market-specific stage name (e.g. „Търг" for Европа); defaults to PAYMENT_STAGE_META. */
  label?: string;
  /** The пера summed into this stage's due amount. */
  points: ContractAmountKey[];
};

export type ContractMarketMeta = {
  label: string;
  currency: "USD" | "EUR";
  /** 'mediation' = договор за посредничество; 'delivery' = договор за доставка. */
  documentType: "mediation" | "delivery";
  points: ContractPointDef[];
  stages: ContractStageDef[];
};

const CUSTOMS_POINT_LABEL = "Мито, ДДС, разтоварване, митнически брокер (ориентировъчно)";
const TRANSPORT_BG_LABEL = "Транспорт от митническа агенция (Ротердам) до Пловдив";

/** The classic five пера / four stages — САЩ and Корея share them. */
const MEDIATION_5_POINTS: ContractPointDef[] = [
  { key: "amountCar", label: "Точка 1 — Кола (тръжна цена, такси, документи, банкови преводи)" },
  { key: "amountTransport", label: "Точка 2 — Сухоземен и морски транспорт, товарене, предмитническа подготовка" },
  { key: "amountCustomsVat", label: `Точка 3 — ${CUSTOMS_POINT_LABEL}` },
  { key: "amountTransportEuBg", label: `Точка 4 — ${TRANSPORT_BG_LABEL}` },
  { key: "amountCommission", label: "Точка 5 — Комисионна" },
];

const MEDIATION_5_STAGES: ContractStageDef[] = [
  { stage: "vehicle", points: ["amountCar"] },
  { stage: "transport", points: ["amountTransport"] },
  { stage: "customs_vat", points: ["amountCustomsVat"] },
  { stage: "final", points: ["amountTransportEuBg", "amountCommission"] },
];

export const CONTRACT_MARKET_META: Record<ContractMarket, ContractMarketMeta> = {
  us: {
    label: "САЩ",
    currency: "USD",
    documentType: "mediation",
    points: MEDIATION_5_POINTS,
    stages: MEDIATION_5_STAGES,
  },
  ca: {
    label: "Канада",
    currency: "EUR",
    documentType: "mediation",
    points: [
      {
        key: "amountCar",
        label: "Точка 1 — Кола + сухоземен и морски транспорт до Европа",
        foreignCurrency: "CAD",
      },
      { key: "amountCustomsVat", label: `Точка 2 — ${CUSTOMS_POINT_LABEL}` },
      { key: "amountTransportEuBg", label: `Точка 3 — ${TRANSPORT_BG_LABEL}` },
      { key: "amountCommission", label: "Точка 4 — Комисионна" },
    ],
    stages: [
      { stage: "vehicle", label: "Кола + транспорт", points: ["amountCar"] },
      { stage: "customs_vat", points: ["amountCustomsVat"] },
      { stage: "final", points: ["amountTransportEuBg", "amountCommission"] },
    ],
  },
  kr: {
    label: "Южна Корея",
    currency: "EUR",
    documentType: "mediation",
    points: MEDIATION_5_POINTS,
    stages: MEDIATION_5_STAGES,
  },
  eu: {
    label: "Европа",
    currency: "EUR",
    documentType: "delivery",
    points: [
      { key: "amountCar", label: "Цена на стоките (автомобила)" },
      { key: "amountTransportEuBg", label: "Транспортни разходи до Пловдив" },
      { key: "amountCommission", label: "Комисионна" },
    ],
    stages: [
      { stage: "vehicle", label: "Търг", points: ["amountCar"] },
      { stage: "final", label: "Финално", points: ["amountTransportEuBg", "amountCommission"] },
    ],
  },
};

/** The stage's display name for a given market (respects per-market overrides). */
export function stageLabel(market: ContractMarket, stage: PaymentStage): string {
  const def = CONTRACT_MARKET_META[market]?.stages.find((s) => s.stage === stage);
  return def?.label ?? PAYMENT_STAGE_META[stage]?.label ?? stage;
}

/** The four payment stages (§4), in display order. */
export const PAYMENT_STAGES = ["vehicle", "transport", "customs_vat", "final"] as const;

export type PaymentStage = (typeof PAYMENT_STAGES)[number];

export const PAYMENT_STAGE_META: Record<PaymentStage, { label: string; description: string }> = {
  vehicle: { label: "Кола", description: "Точка 1 — цена на автомобила, тръжни такси, документи, банкови такси" },
  transport: { label: "Транспорт", description: "Точка 2 — сухоземен и морски транспорт, товарене, предмитническа подготовка" },
  customs_vat: { label: "Мито и ДДС", description: "Точка 3 — мито, ДДС, разтоварване, митнически брокер" },
  final: { label: "Финално плащане", description: "Точка 4 + Точка 5 — транспорт Европа→България и комисионна" },
};

/** Payment-stage statuses (§4.2). */
export const PAYMENT_STATUSES = [
  "not_requested",
  "awaiting_payment",
  "partially_paid",
  "paid",
  "overdue",
  "cancelled",
] as const;

export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

export const PAYMENT_STATUS_META: Record<PaymentStatus, { label: string; badgeClass: string }> = {
  not_requested: { label: "Не е поискано", badgeClass: "bg-neutral-100 text-neutral-600 ring-neutral-200" },
  awaiting_payment: { label: "Очаква плащане", badgeClass: "bg-amber-100 text-amber-800 ring-amber-200" },
  partially_paid: { label: "Частично платено", badgeClass: "bg-blue-100 text-blue-800 ring-blue-200" },
  paid: { label: "Платено", badgeClass: "bg-emerald-100 text-emerald-800 ring-emerald-200" },
  overdue: { label: "Просрочено", badgeClass: "bg-rose-100 text-rose-800 ring-rose-200" },
  cancelled: { label: "Анулирано", badgeClass: "bg-neutral-200 text-neutral-700 ring-neutral-300" },
};

/** Contract lifecycle statuses. `fully_paid` = all four stages paid (§11.8). */
export const CONTRACT_STATUSES = ["draft", "active", "fully_paid", "cancelled"] as const;

export type ContractStatus = (typeof CONTRACT_STATUSES)[number];

export const CONTRACT_STATUS_META: Record<ContractStatus, { label: string; badgeClass: string }> = {
  draft: { label: "Чернова", badgeClass: "bg-neutral-100 text-neutral-600 ring-neutral-200" },
  active: { label: "Активен", badgeClass: "bg-blue-100 text-blue-800 ring-blue-200" },
  fully_paid: { label: "Напълно платен", badgeClass: "bg-emerald-100 text-emerald-800 ring-emerald-200" },
  cancelled: { label: "Анулиран", badgeClass: "bg-neutral-200 text-neutral-700 ring-neutral-300" },
};

/** Deposit-contract statuses (§14). */
export const DEPOSIT_STATUSES = ["draft", "signed", "paid", "used", "returned", "cancelled"] as const;

export type DepositStatus = (typeof DEPOSIT_STATUSES)[number];

export const DEPOSIT_STATUS_META: Record<DepositStatus, { label: string; badgeClass: string }> = {
  draft: { label: "Чернова", badgeClass: "bg-neutral-100 text-neutral-600 ring-neutral-200" },
  signed: { label: "Подписан", badgeClass: "bg-blue-100 text-blue-800 ring-blue-200" },
  paid: { label: "Депозит платен", badgeClass: "bg-amber-100 text-amber-800 ring-amber-200" },
  used: { label: "Използван", badgeClass: "bg-emerald-100 text-emerald-800 ring-emerald-200" },
  returned: { label: "Върнат", badgeClass: "bg-neutral-200 text-neutral-700 ring-neutral-300" },
  cancelled: { label: "Анулиран", badgeClass: "bg-rose-100 text-rose-800 ring-rose-200" },
};

/** Recipient kinds (§5/§8). The kind drives which stages a recipient may serve. */
export const RECIPIENT_KINDS = ["selectauto", "international_partner", "customs_broker"] as const;

export type RecipientKind = (typeof RECIPIENT_KINDS)[number];

export const RECIPIENT_KIND_META: Record<RecipientKind, { label: string }> = {
  selectauto: { label: "SelectAuto" },
  international_partner: { label: "Международен партньор" },
  customs_broker: { label: "Митнически брокер (Мито и ДДС)" },
};

/**
 * Which recipient kinds a payment stage allows (§5, §10, §12). The UI HIDES
 * invalid options (not merely disables them); mutations re-validate against this.
 */
export const STAGE_ALLOWED_RECIPIENT_KINDS: Record<PaymentStage, readonly RecipientKind[]> = {
  vehicle: ["selectauto", "international_partner"],
  transport: ["selectauto", "international_partner"],
  // The spec (§5.3) lists only the two customs brokers here, but the owner
  // confirmed (07.2026) that SelectAuto may also be the payee for мито и ДДС —
  // "2-ро мито ддс е към ауто америка или леан / селект ауто" — since SelectAuto
  // sometimes fronts the customs payment itself.
  customs_vat: ["customs_broker", "selectauto"],
  final: ["selectauto"],
};

/** Client kinds (§3.2). */
export const CLIENT_KINDS = ["individual", "company"] as const;

export type ClientKind = (typeof CLIENT_KINDS)[number];

export const CLIENT_KIND_META: Record<ClientKind, { label: string }> = {
  individual: { label: "Физическо лице" },
  company: { label: "Юридическо лице" },
};

/** Narrow an untrusted string to a RecipientKind (used when parsing form input). */
export function isRecipientKind(value: unknown): value is RecipientKind {
  return typeof value === "string" && (RECIPIENT_KINDS as readonly string[]).includes(value);
}

/** Narrow an untrusted string to a PaymentStage. */
export function isPaymentStage(value: unknown): value is PaymentStage {
  return typeof value === "string" && (PAYMENT_STAGES as readonly string[]).includes(value);
}

/** Narrow an untrusted string to a PaymentStatus. */
export function isPaymentStatus(value: unknown): value is PaymentStatus {
  return typeof value === "string" && (PAYMENT_STATUSES as readonly string[]).includes(value);
}

/** Narrow an untrusted string to a ContractMarket. */
export function isContractMarket(value: unknown): value is ContractMarket {
  return typeof value === "string" && (CONTRACT_MARKETS as readonly string[]).includes(value);
}

/** Narrow an untrusted string to a DepositStatus. */
export function isDepositStatus(value: unknown): value is DepositStatus {
  return typeof value === "string" && (DEPOSIT_STATUSES as readonly string[]).includes(value);
}

/** Narrow an untrusted string to a ClientKind. */
export function isClientKind(value: unknown): value is ClientKind {
  return typeof value === "string" && (CLIENT_KINDS as readonly string[]).includes(value);
}
