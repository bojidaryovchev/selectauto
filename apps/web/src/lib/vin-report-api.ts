import {
  classifyOrderResponse,
  parseBalance,
  parseHistoryPage,
  type HistoryPage,
  type OrderOutcome,
  type ReportBalance,
  type ReportProvider,
} from "@/lib/vin-report-parse";
import { REPORTS_API_BASE } from "@/lib/vin-reports";
import "server-only";

/**
 * Server-only client for AuctionsAPI's PAID reports API (Carfax / AutoCheck), for the admin's „Carfax отчети"
 * (/admin/carfax-otcheti). The same key and host as the free record check (`lib/vin-reports.ts`) and the ingestion.
 *
 * - GET /reports/balance — free;
 * - GET /reports/my-history?page=N — free; every report the key ever bought, 15 a page, oldest first;
 * - GET /reports/{carfax|autocheck}/{vin}?pdf=1&exclude_base_64=1 — PAID, one report from the balance.
 *
 * `pdf=1` because staff send the PDF (all 68 reports bought before this page had one); `exclude_base_64=1` because
 * `base64` is the HTML report again, base64-encoded (565 KB for the test VIN), which nothing here reads.
 *
 * Only `orderReport` spends money. Nothing in this module retries: the docs say never to send the same purchase
 * twice („a duplicate gets 409 generation already in progress"), and the balance and history calls are cheap to
 * repeat on the next page view.
 */

/** A report with a PDF takes 40–60 s (the docs). The admin page that buys allows 120 s (its `maxDuration`). */
export const ORDER_TIMEOUT_MS = 100_000;
const READ_TIMEOUT_MS = 10_000;

function apiKey(): string {
  const key = process.env.AUCTIONS_API_KEY;
  if (!key) throw new Error("AUCTIONS_API_KEY is not set");
  return key;
}

/** One GET; the body as JSON, or null when it isn't JSON (a gateway's HTML page). Throws on a timeout or network error. */
async function get(path: string, timeoutMs: number): Promise<{ status: number; json: unknown }> {
  const res = await fetch(`${REPORTS_API_BASE}${path}`, {
    method: "GET",
    headers: { accept: "application/json", "x-api-key": apiKey() },
    cache: "no-store",
    signal: AbortSignal.timeout(timeoutMs),
  });
  const text = await res.text();
  let json: unknown = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = null;
  }
  return { status: res.status, json };
}

/** The balance, or a thrown error when AuctionsAPI doesn't give one. Free. */
export async function fetchReportBalance(): Promise<ReportBalance> {
  const { status, json } = await get("/reports/balance", READ_TIMEOUT_MS);
  const balance = status === 200 ? parseBalance(json) : null;
  if (!balance) throw new Error(`GET /reports/balance answered HTTP ${status}`);
  return balance;
}

/** One page of the report history, or a thrown error. Free. */
export async function fetchReportHistoryPage(page: number): Promise<HistoryPage> {
  const { status, json } = await get(`/reports/my-history?page=${page}`, READ_TIMEOUT_MS);
  const parsed = status === 200 ? parseHistoryPage(json) : null;
  if (!parsed) throw new Error(`GET /reports/my-history?page=${page} answered HTTP ${status}`);
  return parsed;
}

/** A report PDF is ~0.5 MB; Resend takes 40 MB per e-mail after Base64. Anything near this isn't a report. */
const MAX_PDF_BYTES = 20 * 1024 * 1024;

/**
 * A report's PDF from AuctionsAPI's CDN, to attach to the e-mail to the client. Checked to be a PDF (its `%PDF-`
 * signature) and of a sane size, so a dead link or an error page fails the send before anything goes out. Throws.
 */
export async function fetchReportPdf(pdfUrl: string): Promise<Buffer> {
  const url = new URL(pdfUrl);
  if (url.protocol !== "https:") throw new Error(`not https: ${url.protocol}`);
  const res = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(30_000) });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const bytes = Buffer.from(await res.arrayBuffer());
  if (bytes.length === 0 || bytes.length > MAX_PDF_BYTES) throw new Error(`size ${bytes.length}`);
  if (bytes.subarray(0, 5).toString("latin1") !== "%PDF-") throw new Error("not a PDF");
  return bytes;
}

/**
 * Buy one report — PAID. Never throws: a timeout or a network error is an `unknown` outcome, because AuctionsAPI may
 * still be generating (and charging for) the report it never answered about. `vin` must be validated already.
 */
export async function orderReport(vin: string, provider: ReportProvider): Promise<OrderOutcome> {
  const path = `/reports/${provider}/${encodeURIComponent(vin)}?pdf=1&exclude_base_64=1`;
  try {
    const { status, json } = await get(path, ORDER_TIMEOUT_MS);
    return classifyOrderResponse(status, json);
  } catch (error) {
    return { kind: "unknown", detail: error instanceof Error ? `${error.name}: ${error.message}` : String(error) };
  }
}
