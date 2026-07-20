import type { LeadStatus } from "@/constants/admin";
import type { AdminDetailField, AdminLeadView } from "@/types/admin.type";
import type { CarfaxRequestRow } from "@/queries/admin/list-carfax-requests.query";
import type { InquiryRow } from "@/queries/admin/list-inquiries.query";
import type { CalculatorOfferRow } from "@/queries/admin/list-calculator-offers.query";

/**
 * Server-side mappers that turn a typed lead row into the shared `AdminLeadView`
 * the generic inbox renders. Formatting (dates, EUR) happens here on the server
 * so the client component stays presentation-only and type-agnostic.
 */

const dateFmt = new Intl.DateTimeFormat("bg-BG", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

function fmtDate(d: Date): string {
  return dateFmt.format(d);
}

/** The calculator is USD end-to-end; the `*_eur` columns store USD, so amounts
 *  here are formatted with `$` to match the estimator and the customer email
 *  (`usdStr`). */
function usd(n: number): string {
  return `${Math.round(n).toLocaleString("bg-BG")} $`;
}

/** kr/us/ca → BG market name. */
const MARKET_LABEL: Record<string, string> = {
  kr: "Корея",
  us: "САЩ",
  ca: "Канада",
};

const dash = "—";

/** The table column headers for each lead type (aligned to `cells`). */
export const CARFAX_COLUMNS = ["Име", "Телефон", "VIN", "Автомобил"];
export const INQUIRY_COLUMNS = ["Име", "Телефон", "Интерес", "Бюджет"];
export const CALCULATOR_COLUMNS = ["Име", "Телефон", "Пазар", "Оферта"];

/** Common trailing detail rows (page, IP, timestamps). */
function metaDetails(row: {
  pageUrl: string | null;
  userIp: string | null;
  createdAt: Date;
  updatedAt: Date;
}): AdminDetailField[] {
  const fields: AdminDetailField[] = [];
  if (row.pageUrl) fields.push({ label: "Страница", value: row.pageUrl, href: row.pageUrl });
  if (row.userIp) fields.push({ label: "IP адрес", value: row.userIp, mono: true });
  fields.push({ label: "Получено", value: fmtDate(row.createdAt) });
  fields.push({ label: "Обновено", value: fmtDate(row.updatedAt) });
  return fields;
}

export function toCarfaxView(row: CarfaxRequestRow): AdminLeadView {
  const car = [row.carMake, row.carModel].filter(Boolean).join(" ") || dash;
  const details: AdminDetailField[] = [
    { label: "Име", value: row.fullName },
    { label: "Телефон", value: row.phone, href: `tel:${row.phone}` },
  ];
  if (row.email) details.push({ label: "Имейл", value: row.email, href: `mailto:${row.email}` });
  details.push({ label: "VIN", value: row.vin, mono: true });
  if (row.carMake) details.push({ label: "Марка", value: row.carMake });
  if (row.carModel) details.push({ label: "Модел", value: row.carModel });
  if (row.message) details.push({ label: "Съобщение", value: row.message });
  details.push(...metaDetails(row));

  return {
    type: "carfax",
    id: row.id,
    status: row.status as LeadStatus,
    createdAt: fmtDate(row.createdAt),
    updatedAt: fmtDate(row.updatedAt),
    adminNotes: row.adminNotes,
    cells: [row.fullName, row.phone, row.vin, car],
    details,
  };
}

export function toInquiryView(row: InquiryRow): AdminLeadView {
  const interest =
    row.specificModel || [row.brand, row.model].filter(Boolean).join(" ") || dash;
  const details: AdminDetailField[] = [
    { label: "Име", value: row.name },
    { label: "Телефон", value: row.phone, href: `tel:${row.phone}` },
  ];
  if (row.specificModel) details.push({ label: "Конкретен модел", value: row.specificModel });
  if (row.brand) details.push({ label: "Марка", value: row.brand });
  if (row.model) details.push({ label: "Модел", value: row.model });
  if (row.budgetRange) details.push({ label: "Бюджет", value: row.budgetRange });
  if (row.purchaseTimeframe) details.push({ label: "Срок", value: row.purchaseTimeframe });
  if (row.financingOption) details.push({ label: "Финансиране", value: row.financingOption });
  details.push(...metaDetails(row));

  return {
    type: "inquiry",
    id: row.id,
    status: row.status as LeadStatus,
    createdAt: fmtDate(row.createdAt),
    updatedAt: fmtDate(row.updatedAt),
    adminNotes: row.adminNotes,
    cells: [row.name, row.phone, interest, row.budgetRange || dash],
    details,
  };
}

/** The shape create-calculator-offer.mutation stores in `breakdown_json`.
 *  `lines[].amountUsd` (USD, matching `ImportCostLine`), plus the raw estimator
 *  `inputs` and the rates version the numbers were computed against. */
type BreakdownJson = {
  lines?: { label: string; amountUsd: number }[];
  ratesVerifiedAt?: string;
};

export function toCalculatorView(row: CalculatorOfferRow): AdminLeadView {
  const marketLabel = MARKET_LABEL[row.market] ?? row.market;
  const details: AdminDetailField[] = [
    { label: "Име", value: row.name },
    { label: "Телефон", value: row.phone, href: `tel:${row.phone}` },
    { label: "Имейл", value: row.email, href: `mailto:${row.email}` },
    { label: "Пазар", value: marketLabel },
    { label: "Цена на автомобил", value: usd(row.carPriceEur) },
    { label: "Обща оферта", value: usd(row.totalEur) },
  ];

  // Itemised breakdown snapshot — exactly what the visitor saw/received.
  const breakdown = (row.breakdownJson ?? {}) as BreakdownJson;
  for (const line of breakdown.lines ?? []) {
    details.push({ label: line.label, value: usd(line.amountUsd) });
  }
  if (breakdown.ratesVerifiedAt) {
    details.push({ label: "Тарифи към", value: breakdown.ratesVerifiedAt });
  }
  details.push(...metaDetails(row));

  return {
    type: "calculator",
    id: row.id,
    status: row.status as LeadStatus,
    createdAt: fmtDate(row.createdAt),
    updatedAt: fmtDate(row.updatedAt),
    adminNotes: row.adminNotes,
    cells: [row.name, row.phone, marketLabel, usd(row.totalEur)],
    details,
  };
}
