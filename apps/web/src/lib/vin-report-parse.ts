/**
 * Pure helpers for AuctionsAPI's reports API (Carfax / AutoCheck): reading its
 * answers and walking its report history. No imports, no I/O, so
 * `tests/vin-report-parse.test.mts` loads this file as it is.
 *
 * The answers' shapes are from the key-gated docs (auctionsapi.com/docs/reports,
 * fetched 24.11.2026 through /auction-demo-api/docs-reports) and were confirmed
 * against the live API that day: the balance, the history and a report for the
 * docs' free test VIN. Where the live answer had more than the docs show, it is
 * noted at the field.
 */

export const REPORT_PROVIDERS = ["carfax", "autocheck"] as const;
export type ReportProvider = (typeof REPORT_PROVIDERS)[number];

export function isReportProvider(value: unknown): value is ReportProvider {
  return value === "carfax" || value === "autocheck";
}

/** The docs' own sample VIN: „Use this VIN to try both steps. Reports for it are free." (A 2018 Honda CR-V.) */
export const FREE_TEST_VIN = "7FARW2H56JE022576";

/** GET /reports/balance. One USD balance pays for every report, Pay per VIN included. */
export type ReportBalance = {
  /** How many reports the money covers at our price, as AuctionsAPI counts it (`balance`). */
  reports: number;
  balanceUsd: number;
  /** `available_usd`: the balance less the reports being generated now (live answer; not in the docs). */
  availableUsd: number;
  /** `active_reports_count` / `active_reports_usd`: reports being generated now (live answer; not in the docs). */
  activeReports: number;
  activeUsd: number;
  currency: string;
};

/** A report GET /reports/{type}/{vin} returned. */
export type PurchasedReport = {
  /** AuctionsAPI's report id — the `id` its history lists. */
  externalId: number;
  htmlUrl: string;
  /** Only with `pdf=1`. */
  pdfUrl: string | null;
  /** `is_verified_real` (live answer; undocumented). */
  verifiedReal: boolean | null;
  balanceAfterUsd: number | null;
  /** `balance_after`: reports the remaining money covers. */
  balanceAfterReports: number | null;
};

/** One report of GET /reports/my-history. */
export type HistoryItem = {
  externalId: number;
  provider: ReportProvider;
  vin: string;
  htmlUrl: string | null;
  pdfUrl: string | null;
  verifiedReal: boolean | null;
  createdAt: Date;
};

/** A page of GET /reports/my-history: 15 reports, OLDEST first (seen on the live API, 24.11.2026). */
export type HistoryPage = {
  items: HistoryItem[];
  currentPage: number;
  lastPage: number;
  total: number;
};

/** Why AuctionsAPI refused a report. Every refusal means nothing was bought. */
export type RefusalReason =
  | "no_records"
  | "bad_vin"
  | "insufficient_funds"
  | "inactive"
  | "unauthorized"
  | "not_found"
  | "in_progress"
  | "rate_limited"
  | "other";

/**
 * What a purchase call came to:
 * - `ok`: the report, paid;
 * - `refused`: AuctionsAPI said no — nothing was bought;
 * - `unknown`: no usable answer (a timeout, a gateway error, an unreadable body) — the report may still be generated
 *   and paid, so the caller must not treat it as a failure it can simply retry.
 */
export type OrderOutcome =
  | { kind: "ok"; report: PurchasedReport }
  | { kind: "refused"; reason: RefusalReason; status: number; detail: string }
  | { kind: "unknown"; detail: string };

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);

/** A finite number from a number or a numeric string, else null. */
function num(v: unknown): number | null {
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  if (typeof v === "string" && v.trim() !== "") {
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

/** An http(s) URL, else null — links from the API are opened by staff, so nothing else is passed on. */
function url(v: unknown): string | null {
  if (typeof v !== "string") return null;
  try {
    const u = new URL(v);
    return u.protocol === "https:" || u.protocol === "http:" ? u.toString() : null;
  } catch {
    return null;
  }
}

function bool(v: unknown): boolean | null {
  return typeof v === "boolean" ? v : null;
}

/** upper(btrim(vin)) when it is a valid VIN, else null. */
export function normalizeVin(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const vin = v.trim().toUpperCase();
  return /^[A-HJ-NPR-Z0-9]{17}$/.test(vin) ? vin : null;
}

export function parseBalance(json: unknown): ReportBalance | null {
  if (!isRecord(json)) return null;
  const reports = num(json.balance);
  const balanceUsd = num(json.balance_usd);
  if (reports === null || balanceUsd === null) return null;
  const activeUsd = num(json.active_reports_usd) ?? 0;
  return {
    reports,
    balanceUsd,
    availableUsd: num(json.available_usd) ?? balanceUsd - activeUsd,
    activeReports: num(json.active_reports_count) ?? 0,
    activeUsd,
    currency: typeof json.currency === "string" && json.currency ? json.currency : "USD",
  };
}

export function parsePurchasedReport(json: unknown): PurchasedReport | null {
  if (!isRecord(json)) return null;
  const externalId = num(json.id);
  const htmlUrl = url(json.html);
  if (externalId === null || !Number.isInteger(externalId) || externalId <= 0 || !htmlUrl) return null;
  return {
    externalId,
    htmlUrl,
    pdfUrl: url(json.pdf),
    verifiedReal: bool(json.is_verified_real),
    balanceAfterUsd: num(json.balance_after_usd),
    balanceAfterReports: num(json.balance_after),
  };
}

export function parseHistoryItem(json: unknown): HistoryItem | null {
  if (!isRecord(json)) return null;
  const externalId = num(json.id);
  const vin = normalizeVin(json.vin);
  const provider = typeof json.type === "string" ? json.type.toLowerCase() : null;
  const createdAt = typeof json.created_at === "string" ? new Date(json.created_at) : null;
  if (
    externalId === null ||
    !Number.isInteger(externalId) ||
    externalId <= 0 ||
    !vin ||
    !isReportProvider(provider) ||
    !createdAt ||
    Number.isNaN(createdAt.getTime())
  ) {
    return null;
  }
  const path = isRecord(json.path) ? json.path : {};
  return {
    externalId,
    provider,
    vin,
    htmlUrl: url(path.html),
    pdfUrl: url(path.pdf),
    verifiedReal: bool(json.is_verified_real),
    createdAt,
  };
}

/** A history page, or null when the answer isn't one. Items it can't read are left out. */
export function parseHistoryPage(json: unknown): HistoryPage | null {
  if (!isRecord(json) || !Array.isArray(json.data) || !isRecord(json.meta)) return null;
  const currentPage = num(json.meta.current_page);
  const lastPage = num(json.meta.last_page);
  const total = num(json.meta.total);
  if (currentPage === null || lastPage === null || total === null) return null;
  return {
    items: json.data.map(parseHistoryItem).filter((i): i is HistoryItem => i !== null),
    currentPage,
    lastPage: Math.max(1, lastPage),
    total,
  };
}

/** The `error` text of an error answer, for the logs and the reason. */
function errorText(json: unknown): string {
  if (isRecord(json)) {
    if (typeof json.error === "string") return json.error;
    if (typeof json.message === "string") return json.message;
  }
  return "";
}

/**
 * Classify a purchase answer (GET /reports/{type}/{vin}). `json` is null when the body wasn't JSON.
 *
 * Refusals are the statuses the docs list for this endpoint (400, 402, 403, 404, 409) and the general ones (401,
 * 422, 429): AuctionsAPI answered and generated nothing. 400 „records not found" and 402 charge nothing, says the
 * docs' billing section. Anything else — 5xx, a gateway's HTML, a 200 without a report — is `unknown`.
 */
export function classifyOrderResponse(status: number, json: unknown): OrderOutcome {
  const detail = errorText(json);
  if (status >= 200 && status < 300) {
    const report = parsePurchasedReport(json);
    return report ? { kind: "ok", report } : { kind: "unknown", detail: `HTTP ${status} without a report` };
  }
  const refused = (reason: RefusalReason): OrderOutcome => ({ kind: "refused", reason, status, detail });
  switch (status) {
    case 400:
      return refused(/records not found/i.test(detail) ? "no_records" : "bad_vin");
    case 401:
      return refused("unauthorized");
    case 402:
      return refused("insufficient_funds");
    case 403:
      return refused(/inactive/i.test(detail) ? "inactive" : "unauthorized");
    case 404:
      return refused("not_found");
    case 409:
      return refused("in_progress");
    case 422:
      return refused("other");
    case 429:
      return refused("rate_limited");
    default:
      return { kind: "unknown", detail: `HTTP ${status}${detail ? `: ${detail}` : ""}` };
  }
}

/**
 * Find the history reports we don't hold yet.
 *
 * The history lists every report the key ever bought, 15 a page, oldest first. Pages are read from the newest end
 * until one holds nothing new: everything older was imported before, because an import stores all it found or nothing
 * (the caller writes it in one transaction). In step with the history that is two requests, page 1 (for the page
 * count) and the last page; one when there is a single page. The direction is checked rather than assumed: if the
 * newest reports turn out to be on page 1, pages are read from there instead.
 *
 * Entries `parseHistoryPage` couldn't read (another report type, say) are not on the pages, so they never count as
 * missing — a stop rule that compared totals would read every page on every call because of them.
 *
 * A walk stops at `maxPages` with `complete: false` (only a first import of more than ~600 reports would get there).
 */
export async function collectMissingHistory(options: {
  fetchPage: (page: number) => Promise<HistoryPage>;
  /** Which of these AuctionsAPI ids we already hold. */
  knownIds: (externalIds: number[]) => Promise<Set<number>>;
  maxPages?: number;
}): Promise<{ items: HistoryItem[]; total: number; pagesRead: number; complete: boolean }> {
  const { fetchPage, knownIds, maxPages = 40 } = options;
  const first = await fetchPage(1);
  let pagesRead = 1;

  const pages = new Map<number, HistoryPage>([[1, first]]);
  let order: number[];
  if (first.lastPage <= 1) {
    order = [1];
  } else {
    const last = await fetchPage(first.lastPage);
    pagesRead += 1;
    pages.set(first.lastPage, last);
    const maxId = (p: HistoryPage) => Math.max(0, ...p.items.map((i) => i.externalId));
    const newestLast = maxId(last) >= maxId(first);
    order = Array.from({ length: first.lastPage }, (_, i) => (newestLast ? first.lastPage - i : i + 1));
  }

  const found = new Map<number, HistoryItem>();
  let complete = true;
  for (const pageNo of order) {
    let page = pages.get(pageNo);
    if (!page) {
      if (pagesRead >= maxPages) {
        complete = false;
        break;
      }
      page = await fetchPage(pageNo);
      pagesRead += 1;
    }
    const ids = page.items.map((i) => i.externalId);
    const known = ids.length > 0 ? await knownIds(ids) : new Set<number>();
    const fresh = page.items.filter((i) => !known.has(i.externalId));
    for (const item of fresh) found.set(item.externalId, item);
    if (fresh.length === 0) break;
  }

  // Oldest first, so an adopted claim meets its own report before a later one for the same VIN.
  const items = [...found.values()].sort(
    (a, b) => a.createdAt.getTime() - b.createdAt.getTime() || a.externalId - b.externalId,
  );
  return { items, total: first.total, pagesRead, complete };
}

/**
 * Whether a history report is the one a still-'pending' claim was waiting for: the same VIN and provider, created
 * from 2 minutes before the claim (clocks differ) to 15 minutes after it (a slow PDF, then the history import).
 */
export function reportMatchesClaim(
  item: Pick<HistoryItem, "vin" | "provider" | "createdAt">,
  claim: { vin: string; provider: string; createdAt: Date },
): boolean {
  if (item.vin !== claim.vin || item.provider !== claim.provider) return false;
  const delta = item.createdAt.getTime() - claim.createdAt.getTime();
  return delta >= -2 * 60_000 && delta <= 15 * 60_000;
}
