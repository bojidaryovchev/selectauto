/**
 * AuctionsAPI HTTP client.
 *
 * Responsibilities:
 *   - read the API key from the environment (injected from Secrets Manager)
 *   - build query strings safely
 *   - send the documented auth header: `x-api-key: <key>`
 *   - classify retryable vs terminal errors (429 / 5xx / network = retryable)
 *   - normalize whatever pagination wrapper comes back into NormalizedPage<T>
 *
 * The client itself does NOT sleep/throttle. Pacing (1 req/sec) is enforced by
 * the Step Functions `WaitOneSecond` state so that the rate limit is honored
 * across the whole distributed loop, not just within one Lambda invocation.
 */
import type { ApiArchivedLot, ApiCar, NormalizedPage } from "./types.js";

/** Thrown for upstream failures; `retryable` drives Step Functions retry policy. */
export class AuctionsApiError extends Error {
  constructor(
    message: string,
    readonly statusCode: number | undefined,
    readonly retryable: boolean,
    readonly body?: string,
  ) {
    super(message);
    this.name = "AuctionsApiError";
  }
}

export interface AuctionsApiClientOptions {
  baseUrl?: string;
  apiKey?: string;
  /** Per-request timeout in ms. */
  timeoutMs?: number;
}

const DEFAULT_TIMEOUT_MS = 30_000;

export class AuctionsApiClient {
  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly timeoutMs: number;

  constructor(opts: AuctionsApiClientOptions = {}) {
    // AUCTIONS_API_BASE_URL e.g. "https://auctionsapi.com/api"
    this.baseUrl = (opts.baseUrl ?? process.env.AUCTIONS_API_BASE_URL ?? "").replace(/\/+$/, "");
    this.apiKey = opts.apiKey ?? process.env.AUCTIONS_API_KEY ?? "";
    this.timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS;

    if (!this.baseUrl) throw new Error("AUCTIONS_API_BASE_URL is not set");
    if (!this.apiKey) throw new Error("AUCTIONS_API_KEY is not set");
  }

  /** Build a URL with a safely-encoded query string (skips null/undefined). */
  private buildUrl(path: string, query?: Record<string, string | number | undefined | null>): string {
    const url = new URL(this.baseUrl + (path.startsWith("/") ? path : `/${path}`));
    if (query) {
      for (const [k, v] of Object.entries(query)) {
        if (v === undefined || v === null || v === "") continue;
        url.searchParams.set(k, String(v));
      }
    }
    return url.toString();
  }

  /** Low-level GET with timeout + error classification. Returns parsed JSON. */
  private async getJson(path: string, query?: Record<string, string | number | undefined | null>): Promise<unknown> {
    const url = this.buildUrl(path, query);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);

    let res: Response;
    try {
      res = await fetch(url, {
        method: "GET",
        headers: {
          // Confirmed auth header from the API docs curl example.
          "x-api-key": this.apiKey,
          accept: "application/json",
        },
        signal: controller.signal,
      });
    } catch (err) {
      // Network errors / timeouts are transient -> retryable.
      throw new AuctionsApiError(`Network error calling AuctionsAPI: ${(err as Error).message}`, undefined, true);
    } finally {
      clearTimeout(timer);
    }

    if (!res.ok) {
      const body = await safeText(res);
      // 429 and 5xx are transient; 4xx (other than 429) are terminal.
      const retryable = res.status === 429 || (res.status >= 500 && res.status <= 599);
      throw new AuctionsApiError(`AuctionsAPI returned HTTP ${res.status} for ${path}`, res.status, retryable, body);
    }

    try {
      return await res.json();
    } catch (err) {
      // A 2xx with unparseable JSON is unexpected; treat as retryable once.
      throw new AuctionsApiError(`Failed to parse AuctionsAPI JSON: ${(err as Error).message}`, res.status, true);
    }
  }

  /* -----------------------------------------------------------------------
   * Paginated endpoints
   * --------------------------------------------------------------------- */

  /**
   * GET /api/cars  (active cars) — supports per_page, page, and optional minutes.
   * Used by both the full backfill (no minutes) and the hourly sync (minutes=75).
   */
  async getCarsPage(params: { page: number; perPage: number; minutes?: number }): Promise<NormalizedPage<ApiCar>> {
    const json = await this.getJson("/cars", {
      page: params.page,
      per_page: params.perPage,
      minutes: params.minutes,
    });
    return normalizePage<ApiCar>(json, params.page, params.perPage);
  }

  /**
   * GET /api/archived-lots — same pagination ENVELOPE as /api/cars (data/links/
   * meta, links.next drives looping), but a DIFFERENT, FLAT record shape: each
   * item is an ApiArchivedLot (lot_id/car_id/vin/lot/domain/status/bid/...),
   * NOT a car with nested lots. CONFIRMED against the live API (2026-06).
   */
  async getArchivedLotsPage(params: {
    page: number;
    perPage: number;
    minutes?: number;
  }): Promise<NormalizedPage<ApiArchivedLot>> {
    const json = await this.getJson("/archived-lots", {
      page: params.page,
      per_page: params.perPage,
      minutes: params.minutes,
    });
    return normalizePage<ApiArchivedLot>(json, params.page, params.perPage);
  }

  /* -----------------------------------------------------------------------
   * Reference data endpoints (typed loosely; shapes unconfirmed)
   * --------------------------------------------------------------------- */

  async getManufacturers(): Promise<unknown[]> {
    const json = await this.getJson("/manufacturers/cars");
    return extractArray(json);
  }

  async getModels(manufacturerId: number): Promise<unknown[]> {
    const json = await this.getJson(`/models/${manufacturerId}/cars`);
    return extractArray(json);
  }

  async getGenerations(modelId: number): Promise<unknown[]> {
    const json = await this.getJson(`/generations/${modelId}/cars`);
    return extractArray(json);
  }

  /* -----------------------------------------------------------------------
   * Detail refresh endpoints
   * --------------------------------------------------------------------- */

  /** GET /api/search-lot/{lot}/{domain}?prices_history=1 */
  async searchLot(lot: string, domain: string, pricesHistory = true): Promise<unknown> {
    return this.getJson(`/search-lot/${encodeURIComponent(lot)}/${encodeURIComponent(domain)}`, {
      prices_history: pricesHistory ? 1 : undefined,
    });
  }

  /** GET /api/search-vin/{vin}?prices_history=1 */
  async searchVin(vin: string, pricesHistory = true): Promise<unknown> {
    return this.getJson(`/search-vin/${encodeURIComponent(vin)}`, {
      prices_history: pricesHistory ? 1 : undefined,
    });
  }
}

/* ===========================================================================
 * Helpers
 * ======================================================================== */

async function safeText(res: Response): Promise<string | undefined> {
  try {
    return await res.text();
  } catch {
    return undefined;
  }
}

/**
 * Pull the array of records out of a response that may be:
 *   - a bare array: [ ... ]
 *   - Laravel-style: { data: [ ... ], meta: {...}, links: {...} }
 *   - { data: [ ... ] } without meta
 */
function extractArray(json: unknown): unknown[] {
  if (Array.isArray(json)) return json;
  if (json && typeof json === "object" && Array.isArray((json as Record<string, unknown>).data)) {
    return (json as { data: unknown[] }).data;
  }
  return [];
}

/**
 * Normalize a paginated response into NormalizedPage<T>.
 *
 * CONFIRMED against the live API (2026-06): AuctionsAPI uses Laravel's
 * "simplePaginate" envelope, which means there is NO total/last_page:
 *
 *   {
 *     "data":  [ ... ],
 *     "links": { "first": "...", "last": null, "prev": null|"...", "next": null|"..." },
 *     "meta":  { "current_page": 1, "from": 1, "path": "...", "per_page": 2, "to": 2 }
 *   }
 *
 * Therefore `links.next` is the AUTHORITATIVE next-page signal: a URL string when
 * there is another page, `null` on the last page. `meta.last_page` does not
 * exist (lastPage stays null). We still keep the "empty array => stop" and
 * "short page => stop" fallbacks as belt-and-suspenders.
 */
export function normalizePage<T>(json: unknown, requestedPage: number, perPage: number): NormalizedPage<T> {
  const data = extractArray(json) as T[];

  const obj = (json && typeof json === "object" ? (json as Record<string, unknown>) : {}) as Record<string, unknown>;
  const meta = (obj.meta && typeof obj.meta === "object" ? (obj.meta as Record<string, unknown>) : obj) as Record<
    string,
    unknown
  >;
  const links = (obj.links && typeof obj.links === "object" ? (obj.links as Record<string, unknown>) : {}) as Record<
    string,
    unknown
  >;

  const currentPage = toInt(meta.current_page) ?? requestedPage;
  // AuctionsAPI does not return last_page; left null intentionally.
  const lastPage = toInt(meta.last_page);

  // Authoritative: links.next is a URL when there's a next page, null otherwise.
  const nextLink = typeof links.next === "string" && links.next.length > 0;

  let hasNextPage: boolean;
  if (links.next !== undefined) {
    // The envelope told us explicitly.
    hasNextPage = nextLink;
  } else if (lastPage !== null) {
    hasNextPage = currentPage < lastPage;
  } else {
    // Fallback for any endpoint that omits links: short/empty page => stop.
    hasNextPage = data.length >= perPage && data.length > 0;
  }

  const nextPage = hasNextPage ? currentPage + 1 : null;

  return {
    data,
    currentPage,
    nextPage,
    lastPage,
    hasNextPage,
    rawMeta: { meta: obj.meta, links: obj.links },
  };
}

function toInt(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return Math.trunc(v);
  if (typeof v === "string" && v.trim() !== "" && !Number.isNaN(Number(v))) return Math.trunc(Number(v));
  return null;
}
