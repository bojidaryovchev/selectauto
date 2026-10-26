import { APP_ROLE_META, type AppRole } from "@/constants/admin";
import {
  CLIENT_KIND_META,
  CONTRACT_MARKET_META,
  CONTRACT_STATUS_META,
  type ClientKind,
  type ContractMarket,
  type ContractStatus,
  DEPOSIT_STATUS_META,
  type DepositStatus,
  PAYMENT_STAGE_META,
  PAYMENT_STATUS_META,
  type PaymentStage,
  type PaymentStatus,
  RECIPIENT_KIND_META,
  type RecipientKind,
} from "@/constants/contracts";

/**
 * Readable details for one `contract_events` row (/admin/dnevnik): the `data`
 * JSON as label/value lines — status, stage and market codes in Bulgarian, and
 * for an edit only the fields that changed („Сума: 7 825.00 → 8 000.00"). The
 * log printed the raw JSON, which no one reads on a phone. Pure.
 */
export type AuditDetail = { label: string; value: string };

const KEY_LABELS: Record<string, string> = {
  number: "№",
  contractNumber: "Договор №",
  total: "Сума",
  amount: "Сума",
  due: "Дължимо",
  totalPaid: "Платено общо",
  paidAt: "Платено на",
  market: "Пазар",
  currency: "Валута",
  stage: "Етап",
  version: "Версия",
  kind: "Вид",
  recipient: "Получател",
  typedAmount: "Въведена сума",
  typedCurrency: "Валута на въведената сума",
  status: "Статус",
  newStatus: "Нов статус",
  oldStatus: "Предишен статус",
  reason: "Причина",
  note: "Бележка",
  filename: "Файл",
  sizeBytes: "Размер",
  contentType: "Вид файл",
  name: "Име",
  client: "Клиент",
  email: "Имейл",
  year: "Година",
  series: "Серия",
  nextNumber: "Следващ №",
  ida: "Обява в mobile.bg №",
  priceEur: "Цена (EUR)",
  computedPriceEur: "Изчислена цена (EUR)",
  markupPct: "Надценка (%)",
  manualPrice: "Ръчна цена",
  pictures: "Снимки",
  skipped: "Пропуснати снимки",
  by: "От",
  dueDate: "Падеж",
  clearedPaidAt: "Изчистена дата на плащане",
  clearedPaidAmount: "Изчистена платена сума",
  vin: "VIN",
  carIds: "Обяви",
  fee: "Такса",
  requester: "Заявител",
  usdEurRate: "Курс USD→EUR",
  // A contract's fields (its edits are logged with the new values).
  totalAmount: "Обща сума",
  amountCar: "Точка 1 — Кола",
  amountCarForeign: "Кола (в оригиналната валута)",
  foreignRate: "Курс",
  amountTransport: "Точка 2 — Транспорт",
  amountCustomsVat: "Точка 3 — Мито и ДДС",
  amountTransportEuBg: "Точка 4 — Транспорт до България",
  amountCommission: "Точка 5 — Комисионна",
  deposit: "Депозит",
  depositDeduction: "Приспаднат депозит",
  auctionPlatform: "Аукцион",
  carMake: "Марка",
  carModel: "Модел",
  carYear: "Година на колата",
  contractDate: "Дата на договора",
  paymentBasis: "Основание за плащане",
  purchaseMarket: "Пазар на покупка",
  // A recipient's fields.
  active: "Активен",
  address: "Адрес",
  country: "Държава",
  vatNumber: "ДДС / рег. номер",
  bankName: "Банка",
  bankAddress: "Адрес на банката",
  iban: "IBAN / сметка",
  swiftBic: "SWIFT / BIC",
  routingCode: "Routing code",
  chargesInstruction: "Разноски на превода",
  paymentMethod: "Вид плащане",
};

/** Internal ids and hashes — noise in a log read by people. */
const HIDDEN_KEYS = new Set([
  "payloadHash",
  "userId",
  "documentId",
  "id",
  "createdAt",
  "updatedAt",
  "createdBy",
  "updatedBy",
]);

function statusLabel(entity: string, code: string): string {
  if (entity === "contract") return CONTRACT_STATUS_META[code as ContractStatus]?.label ?? code;
  if (entity === "payment") return PAYMENT_STATUS_META[code as PaymentStatus]?.label ?? code;
  if (entity === "deposit") return DEPOSIT_STATUS_META[code as DepositStatus]?.label ?? code;
  return code;
}

function format(entity: string, key: string, value: unknown): string {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "boolean") return value ? "да" : "не";
  if (Array.isArray(value)) return value.length ? value.map((v) => format(entity, key, v)).join(", ") : "—";
  if (typeof value === "object") return JSON.stringify(value);
  if (key === "sizeBytes" && typeof value === "number") return `${Math.max(1, Math.round(value / 1024))} KB`;
  const s = String(value);
  if (key === "status" || key === "newStatus" || key === "oldStatus") return statusLabel(entity, s);
  if (key === "stage") return PAYMENT_STAGE_META[s as PaymentStage]?.label ?? s;
  if (key === "market") return CONTRACT_MARKET_META[s as ContractMarket]?.label ?? s;
  if (key === "kind" && entity === "client") return CLIENT_KIND_META[s as ClientKind]?.label ?? s;
  if (key === "kind" && entity === "recipient") return RECIPIENT_KIND_META[s as RecipientKind]?.label ?? s;
  if (key === "kind" && entity === "contract")
    return s === "mediation" ? "посредничество" : s === "delivery" ? "доставка" : s;
  if (key === "role") return APP_ROLE_META[s as AppRole]?.label ?? s;
  if (key === "series") return s === "deposit" ? "депозити" : s === "contract" ? "договори" : s;
  return s;
}

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);

export function auditDetails(entity: string, action: string, data: unknown): AuditDetail[] {
  if (!isRecord(data)) return [];
  const out: AuditDetail[] = [];
  const add = (key: string, value: string) => out.push({ label: KEY_LABELS[key] ?? key, value });
  const { old: before, new: after, ...rest } = data;

  if (isRecord(after)) {
    // An edit lists what changed (keys of the new values); a creation lists what was set.
    for (const [key, value] of Object.entries(after)) {
      if (HIDDEN_KEYS.has(key)) continue;
      if (isRecord(before)) {
        if (JSON.stringify(before[key] ?? null) === JSON.stringify(value ?? null)) continue;
        add(key, `${format(entity, key, before[key])} → ${format(entity, key, value)}`);
      } else if (value !== null && value !== "") {
        add(key, format(entity, key, value));
      }
    }
  } else if (after !== undefined || before !== undefined) {
    // One value changed, before → after: the field it names (a renumber), the
    // roles, or else the status.
    const key = typeof rest.field === "string" ? rest.field : action === "roles_changed" ? "role" : "status";
    out.push({
      label: action === "roles_changed" ? "Роли" : (KEY_LABELS[key] ?? key),
      value: `${format(entity, key, before)} → ${format(entity, key, after)}`,
    });
  }

  for (const [key, value] of Object.entries(rest)) {
    if (HIDDEN_KEYS.has(key) || key === "field") continue;
    add(key, format(entity, key, value));
  }
  return out;
}

/**
 * Where an event's record lives in the admin, when it still exists. `contractId`
 * is the contract of a contract or payment event (null once deleted);
 * `depositExists` likewise for a deposit.
 */
export function auditEntityHref(row: {
  entity: string;
  entityId: number;
  data: unknown;
  contractId: number | null;
  depositExists: boolean;
}): { href: string; external?: boolean } | null {
  switch (row.entity) {
    case "contract":
    case "payment":
      return row.contractId ? { href: `/admin/dogovori/${row.contractId}` } : null;
    case "deposit":
      return row.depositExists ? { href: "/admin/depoziti" } : null;
    case "client":
      return null;
    case "recipient":
      return { href: "/admin/poluchateli" };
    case "user":
      return { href: "/admin/potrebiteli" };
    case "car_deindex":
      return { href: "/admin/skriti-obyavi" };
    case "numbering":
      return { href: isRecord(row.data) && row.data.series === "deposit" ? "/admin/depoziti" : "/admin/dogovori" };
    case "mobilebg_advert":
      return row.entityId > 0 ? { href: `/avtomobil/${row.entityId}`, external: true } : null;
    default:
      return null;
  }
}
