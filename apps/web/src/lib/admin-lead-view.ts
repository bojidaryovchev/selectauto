import type { LeadStatus } from "@/constants/admin";
import type {
  AdminDetailField,
  AdminLeadColumn,
  AdminLeadView,
  LeadMake,
  LeadMarket,
  LeadVinReports,
} from "@/types/admin.type";
import type { CarfaxRequestRow } from "@/queries/admin/list-carfax-requests.query";
import type { InquiryRow } from "@/queries/admin/list-inquiries.query";
import type { CalculatorOfferRow } from "@/queries/admin/list-calculator-offers.query";
import { leadSource } from "@/lib/lead-source";
import type { MakeLogoLookup } from "@/lib/make-logo-lookup";
import { formatSofiaDateTime } from "@/lib/sofia-time";
import { vinReportsHref } from "@/constants/vin-reports";
import { leadEmailAddress } from "@/lib/vin-report-email";
import type { VinReportView } from "@/types/vin-report.type";

/**
 * Server-side mappers that turn a typed lead row into the shared `AdminLeadView`
 * the generic inbox renders. Formatting (dates, EUR) happens here on the server
 * so the client component stays presentation-only and type-agnostic.
 */

/** The plate for a make, or none without one. */
function makeOf(name: string | null, logoFor: MakeLogoLookup): LeadMake | undefined {
  const trimmed = name?.trim();
  return trimmed ? { name: trimmed, logo: logoFor(trimmed) } : undefined;
}

/** Sofia time — the formatter used to have no time zone, so the server (UTC) printed every lead 2–3 h early. */
function fmtDate(d: Date): string {
  return formatSofiaDateTime(d);
}

/** The calculator computes in USD; the `*_eur` columns store USD, so amounts
 *  here are formatted with `$` to match the estimator and the customer email
 *  (`usdStr`). */
function usd(n: number): string {
  return `${Math.round(n).toLocaleString("bg-BG")} $`;
}

/** EUR-quoted fee rows carry `amountEur` and are shown unconverted, matching
 *  the estimator and the customer email. */
function eur(n: number): string {
  return `${Math.round(n).toLocaleString("bg-BG")} €`;
}

/** kr/us/ca → BG market name. */
const MARKET_LABEL: Record<string, string> = {
  kr: "Корея",
  us: "САЩ",
  ca: "Канада",
};

/** A stored market the calculator knows, for its flag. */
function marketOf(market: string): LeadMarket | undefined {
  return market === "kr" || market === "us" || market === "ca" ? market : undefined;
}

const dash = "—";

/** The table column headers for each lead type (aligned to `cells`); the offer's amount is right-aligned. */
export const CARFAX_COLUMNS: AdminLeadColumn[] = [
  { label: "Име" },
  { label: "Телефон" },
  { label: "VIN" },
  { label: "Автомобил" },
];
export const INQUIRY_COLUMNS: AdminLeadColumn[] = [
  { label: "Име" },
  { label: "Телефон" },
  { label: "Интерес" },
  { label: "Бюджет" },
];
export const CALCULATOR_COLUMNS: AdminLeadColumn[] = [
  { label: "Име" },
  { label: "Телефон" },
  { label: "Пазар" },
  { label: "Оферта", num: true },
];

/** The drawer's last list: the ad source and campaign (read from the page address, owner decision 40), page, IP,
 *  timestamps. */
function metaDetails(row: {
  pageUrl: string | null;
  userIp: string | null;
  createdAt: Date;
  updatedAt: Date;
}): AdminDetailField[] {
  const fields: AdminDetailField[] = [];
  const { source, campaign } = leadSource(row.pageUrl);
  if (source) fields.push({ label: "Източник", value: source });
  if (campaign) fields.push({ label: "Кампания", value: campaign });
  if (row.pageUrl) fields.push({ label: "Страница", value: row.pageUrl, href: row.pageUrl });
  if (row.userIp) fields.push({ label: "IP адрес", value: row.userIp, mono: true });
  fields.push({ label: "Получено", value: fmtDate(row.createdAt) });
  fields.push({ label: "Обновено", value: fmtDate(row.updatedAt) });
  return fields;
}

/**
 * The Carfax / AutoCheck box of the lead's drawer, when the viewer may buy reports (`reports.order`): `reports` are
 * the ones bought for the lead's VIN (by anyone, for any lead), `sends` when each was e-mailed to THIS lead (keyed
 * `${reportId}:${leadId}`), `vehicle` AuctionsAPI's name for the car (the e-mail's default text).
 */
export type CarfaxReportsContext = {
  reports: VinReportView[];
  sends: Map<string, { sentAtText: string; threadId: number | null }>;
  vehicle: string | null;
};

export function toCarfaxView(
  row: CarfaxRequestRow,
  logoFor: MakeLogoLookup,
  reportsContext: CarfaxReportsContext | null = null,
): AdminLeadView {
  const car = [row.carMake, row.carModel].filter(Boolean).join(" ") || dash;
  const make = makeOf(row.carMake, logoFor);
  const details: AdminDetailField[] = [
    { label: "Име", value: row.fullName },
    { label: "Телефон", value: row.phone, href: `tel:${row.phone}` },
  ];
  if (row.email) details.push({ label: "Имейл", value: row.email, href: `mailto:${row.email}` });
  details.push({ label: "VIN", value: row.vin, mono: true });
  if (row.carMake) details.push({ label: "Марка", value: row.carMake, make });
  if (row.carModel) details.push({ label: "Модел", value: row.carModel });
  if (row.message) details.push({ label: "Съобщение", value: row.message });

  return {
    type: "carfax",
    id: row.id,
    status: row.status as LeadStatus,
    createdAt: fmtDate(row.createdAt),
    updatedAt: fmtDate(row.updatedAt),
    adminNotes: row.adminNotes,
    cells: [{ text: row.fullName }, { text: row.phone }, { text: row.vin, mono: true }, { text: car, make }],
    details,
    amounts: [],
    meta: metaDetails(row),
    vinReports: reportsContext ? carfaxReportsBox(row, reportsContext) : undefined,
  };
}

function carfaxReportsBox(row: CarfaxRequestRow, ctx: CarfaxReportsContext): LeadVinReports {
  const vin = row.vin.trim().toUpperCase();
  return {
    leadId: row.id,
    name: row.fullName,
    email: leadEmailAddress(row.email),
    vin,
    vehicle: ctx.vehicle ?? ([row.carMake, row.carModel].filter(Boolean).join(" ") || null),
    checkHref: vinReportsHref(vin, row.id),
    items: ctx.reports.map((report) => {
      const sent = ctx.sends.get(`${report.id}:${row.id}`);
      return { ...report, sentAtText: sent?.sentAtText ?? null, sentThreadId: sent?.threadId ?? null };
    }),
  };
}

export function toInquiryView(row: InquiryRow, logoFor: MakeLogoLookup): AdminLeadView {
  // „Интерес" is the car asked about. `specific_model` is not a model: it is the
  // modal's answer to „Търсите ли конкретен модел?" — „Да"/„Не" — and taking it
  // first put „Да"/„Не" in this column for every inquiry.
  const interest = [row.brand, row.model].filter(Boolean).join(" ") || dash;
  const make = makeOf(row.brand, logoFor);
  const details: AdminDetailField[] = [
    { label: "Име", value: row.name },
    { label: "Телефон", value: row.phone, href: `tel:${row.phone}` },
  ];
  if (row.specificModel) details.push({ label: "Търси конкретен модел", value: row.specificModel });
  if (row.brand) details.push({ label: "Марка", value: row.brand, make });
  if (row.model) details.push({ label: "Модел", value: row.model });
  if (row.budgetRange) details.push({ label: "Бюджет", value: row.budgetRange });
  if (row.purchaseTimeframe) details.push({ label: "Срок", value: row.purchaseTimeframe });
  if (row.financingOption) details.push({ label: "Финансиране", value: row.financingOption });

  return {
    type: "inquiry",
    id: row.id,
    status: row.status as LeadStatus,
    createdAt: fmtDate(row.createdAt),
    updatedAt: fmtDate(row.updatedAt),
    adminNotes: row.adminNotes,
    cells: [{ text: row.name }, { text: row.phone }, { text: interest, make }, { text: row.budgetRange || dash }],
    details,
    amounts: [],
    meta: metaDetails(row),
  };
}

/** The shape create-calculator-offer.mutation stores in `breakdown_json`.
 *  `lines[]` matches `ImportCostLine` (USD always; `amountEur` on EUR-quoted fee
 *  rows), plus the raw estimator `inputs` and the rates version the numbers
 *  were computed against. */
type BreakdownJson = {
  inputs?: {
    vehicleType?: string;
    auction?: string;
    location?: string;
    caFromBc?: boolean;
    technotest?: boolean;
    originDeclaration?: boolean;
  };
  lines?: { label: string; amountUsd: number; amountEur?: number }[];
  ratesVerifiedAt?: string;
};

/** The estimator's own labels (components/calculator/cost-estimator.tsx). */
const VEHICLE_TYPE_LABEL: Record<string, string> = { sedan: "Седан", suv: "Джип / SUV" };
const AUCTION_LABEL: Record<string, string> = { copart: "Copart", iaai: "IAAI" };

export function toCalculatorView(row: CalculatorOfferRow): AdminLeadView {
  const marketLabel = MARKET_LABEL[row.market] ?? row.market;
  const market = marketOf(row.market);
  const breakdown = (row.breakdownJson ?? {}) as BreakdownJson;
  const inputs = breakdown.inputs ?? {};
  const details: AdminDetailField[] = [
    { label: "Име", value: row.name },
    { label: "Телефон", value: row.phone, href: `tel:${row.phone}` },
    { label: "Имейл", value: row.email, href: `mailto:${row.email}` },
    { label: "Пазар", value: marketLabel, market },
  ];
  // What the visitor chose — stored with every offer, and the transport line of
  // a САЩ quote depends on the auction and the yard, yet none of it was shown.
  if (inputs.vehicleType) {
    details.push({ label: "Тип", value: VEHICLE_TYPE_LABEL[inputs.vehicleType] ?? inputs.vehicleType });
  }
  if (row.market === "us" && inputs.auction) {
    details.push({ label: "Аукцион", value: AUCTION_LABEL[inputs.auction] ?? inputs.auction });
  }
  if (row.market === "us" && inputs.location) details.push({ label: "Локация", value: inputs.location });
  if (row.market === "ca" && typeof inputs.caFromBc === "boolean") {
    details.push({ label: "Провинция", value: inputs.caFromBc ? "Британска Колумбия" : "Друга провинция" });
  }
  if (row.market === "kr" && typeof inputs.originDeclaration === "boolean") {
    details.push({ label: "Декларация за произход", value: inputs.originDeclaration ? "Да" : "Не" });
  }
  if (inputs.technotest) details.push({ label: "Технотест", value: "Да" });

  // The amounts get a list of their own, right-aligned (board `ad-offers-drawer`), in the order they always had.
  const amounts: AdminDetailField[] = [
    { label: "Цена на автомобил", value: usd(row.carPriceEur) },
    { label: "Обща оферта", value: usd(row.totalEur), big: true },
  ];
  // Itemised breakdown snapshot — exactly what the visitor saw/received.
  for (const line of breakdown.lines ?? []) {
    amounts.push({
      label: line.label,
      value: line.amountEur != null ? eur(line.amountEur) : usd(line.amountUsd),
    });
  }
  if (breakdown.ratesVerifiedAt) {
    amounts.push({ label: "Тарифи към", value: breakdown.ratesVerifiedAt });
  }

  return {
    type: "calculator",
    id: row.id,
    status: row.status as LeadStatus,
    createdAt: fmtDate(row.createdAt),
    updatedAt: fmtDate(row.updatedAt),
    adminNotes: row.adminNotes,
    cells: [{ text: row.name }, { text: row.phone }, { text: marketLabel, market }, { text: usd(row.totalEur) }],
    details,
    amounts,
    meta: metaDetails(row),
  };
}
