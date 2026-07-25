/**
 * Shared constants for the contracts & payments module (/admin/dogovori,
 * /admin/depoziti, /admin/poluchateli — техническо задание "договори и
 * плащания", docs/contracts-payments-plan.md). Values mirror the DB columns
 * created by migration 0038; labels are Bulgarian (the whole back office is BG).
 */

/** Contract markets (§3.1). The market fixes the template + currency. */
export const CONTRACT_MARKETS = ["us_ca", "kr"] as const;

export type ContractMarket = (typeof CONTRACT_MARKETS)[number];

export const CONTRACT_MARKET_META: Record<ContractMarket, { label: string; currency: "USD" | "EUR" }> = {
  us_ca: { label: "САЩ / Канада", currency: "USD" },
  kr: { label: "Южна Корея", currency: "EUR" },
};

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
  customs_vat: ["customs_broker"],
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
