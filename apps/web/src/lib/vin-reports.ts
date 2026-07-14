/**
 * Server-only client for the AuctionsAPI **Reports API** (Carfax / AutoCheck
 * record availability). Same host + `x-api-key` auth as the ingestion client
 * (`packages/functions/shared/auctionsApiClient.ts`), but scoped to the web app's
 * VIN-checker tool. Imported ONLY by the `/api/vin-check` route handler (server
 * context) and reads a non-`NEXT_PUBLIC_` env var, so the key is never bundled to
 * the client — Next strips server env + this module from any client graph.
 *
 * This module intentionally exposes ONLY the FREE `check-records` endpoint (record
 * counts + normalized vehicle name). The PAID `/reports/{type}/{vin}` endpoint
 * spends a finite report credit per call, so it is deliberately NOT wired to any
 * public surface — the /proverka-vin tool shows availability and routes the user
 * to the Carfax lead form, where a report is run manually for a real lead.
 */

const API_BASE = (process.env.AUCTIONS_API_BASE_URL ?? "https://auctionsapi.com/api").replace(/\/+$/, "");

/** VIN format: 17 chars, A–Z/0–9, excluding I, O, Q (ISO 3779). Upper-cased. */
const VIN_RE = /^[A-HJ-NPR-Z0-9]{17}$/;

export function isValidVin(vin: string): boolean {
  return VIN_RE.test(vin.trim().toUpperCase());
}

export type VinRecordCheck = {
  vin: string;
  /** Normalized vehicle description from the provider, e.g. "HONDA CR-V EX 2018". */
  vehicle: string | null;
  carfax: number;
  autocheck: number;
};

/**
 * Call the FREE `/reports/check-records/{vin}` endpoint. Returns record counts +
 * the normalized vehicle name, or throws on a bad key / upstream error (the route
 * handler maps that to a user-facing message). Assumes `vin` is already validated.
 */
export async function checkVinRecords(vin: string): Promise<VinRecordCheck> {
  const apiKey = process.env.AUCTIONS_API_KEY;
  if (!apiKey) throw new Error("AUCTIONS_API_KEY is not set");

  const normalized = vin.trim().toUpperCase();
  const url = `${API_BASE}/reports/check-records/${encodeURIComponent(normalized)}`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20_000);
  let res: Response;
  try {
    res = await fetch(url, {
      method: "GET",
      headers: { accept: "application/json", "x-api-key": apiKey },
      signal: controller.signal,
      // Never cache a per-VIN lookup at the fetch layer.
      cache: "no-store",
    });
  } finally {
    clearTimeout(timer);
  }

  if (!res.ok) {
    throw new Error(`Reports API returned HTTP ${res.status}`);
  }

  const json = (await res.json()) as {
    vin?: string;
    vehicle?: string;
    carfax?: number;
    autocheck?: number;
  };

  return {
    vin: json.vin ?? normalized,
    vehicle: json.vehicle ?? null,
    carfax: Number.isFinite(json.carfax) ? Number(json.carfax) : 0,
    autocheck: Number.isFinite(json.autocheck) ? Number(json.autocheck) : 0,
  };
}
