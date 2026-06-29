/**
 * Parse/serialize CarFilters ⇄ URLSearchParams. Shared by the server (page.tsx
 * reads searchParams → CarFilters) and the client (filter bar pushes CarFilters
 * → URL). The URL is the single source of truth for filter state, so a shared,
 * symmetric (de)serializer keeps SSR and client navigation in lockstep.
 *
 * Validation/clamping lives in `@/schemas/car-filters.schema` (zod); this module
 * only does the string↔value plumbing. Keys are short and legacy-flavored.
 */
import type { CarFilters } from "@/types/car-filters.type";

/** URL param keys (kept short; mirror the legacy `saa_*` intent without the prefix). */
const KEYS = {
  status: "status",
  channel: "channel",
  market: "market",
  brand: "brand",
  model: "model",
  color: "color",
  drive: "drive",
  condition: "condition",
  type: "type",
  yearFrom: "year_from",
  yearTo: "year_to",
  priceMin: "price_min",
  priceMax: "price_max",
  search: "q",
} as const;

function intOrUndef(v: string | null): number | undefined {
  if (v == null || v.trim() === "") return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}

/**
 * Parse a URLSearchParams (or a Next `searchParams` record) into CarFilters.
 * Unknown/invalid values are dropped rather than throwing — the page should
 * always render. Accepts either a URLSearchParams or a plain record.
 */
export function parseCarFilters(input: URLSearchParams | Record<string, string | string[] | undefined>): CarFilters {
  const get = (key: string): string | null => {
    if (input instanceof URLSearchParams) return input.get(key);
    const v = input[key];
    if (Array.isArray(v)) return v[0] ?? null;
    return v ?? null;
  };

  const filters: CarFilters = {};

  // Only "past" is meaningful in the URL; "active" is the default (omitted).
  const status = get(KEYS.status);
  if (status === "past") filters.status = "past";

  const channel = get(KEYS.channel);
  if (channel === "buy-now" || channel === "auction") filters.channel = channel;

  const market = get(KEYS.market);
  if (market === "us" || market === "kr" || market === "ca") filters.market = market;

  const brand = intOrUndef(get(KEYS.brand));
  if (brand !== undefined) filters.brand = brand;

  const model = intOrUndef(get(KEYS.model));
  if (model !== undefined) filters.model = model;

  const color = get(KEYS.color);
  if (color) filters.color = color;

  const drive = get(KEYS.drive);
  if (drive === "front" || drive === "all" || drive === "rear") filters.drive = drive;

  // Condition is one or more canonical enum values (some BG labels cover several
  // raws, e.g. run_and_drives,engine_starts), comma-joined. The exact set is
  // validated against facets at query time.
  const condition = get(KEYS.condition);
  if (condition && /^[a-z_]+(,[a-z_]+)*$/.test(condition)) filters.condition = condition;

  // Combined type: "vt:<value>" or "bt:<value>" (the value itself is validated
  // against facets at query time; here we only accept the prefixed shape).
  const type = get(KEYS.type);
  if (type && /^(vt|bt):[a-z_]+$/.test(type)) filters.type = type;

  const yearFrom = intOrUndef(get(KEYS.yearFrom));
  if (yearFrom !== undefined) filters.yearFrom = yearFrom;

  const yearTo = intOrUndef(get(KEYS.yearTo));
  if (yearTo !== undefined) filters.yearTo = yearTo;

  const priceMin = intOrUndef(get(KEYS.priceMin));
  if (priceMin !== undefined) filters.priceMin = priceMin;

  const priceMax = intOrUndef(get(KEYS.priceMax));
  if (priceMax !== undefined) filters.priceMax = priceMax;

  const search = get(KEYS.search);
  if (search && search.trim() !== "") filters.search = search.trim();

  return filters;
}

/**
 * Serialize CarFilters → a URLSearchParams (omitting empty values). Use
 * `.toString()` for a query string. Order is stable so cache keys / URLs are
 * deterministic.
 */
export function serializeCarFilters(filters: CarFilters): URLSearchParams {
  const params = new URLSearchParams();
  if (filters.status === "past") params.set(KEYS.status, "past");
  if (filters.channel) params.set(KEYS.channel, filters.channel);
  if (filters.market) params.set(KEYS.market, filters.market);
  if (filters.brand !== undefined) params.set(KEYS.brand, String(filters.brand));
  if (filters.model !== undefined) params.set(KEYS.model, String(filters.model));
  if (filters.color) params.set(KEYS.color, filters.color);
  if (filters.drive) params.set(KEYS.drive, filters.drive);
  if (filters.condition) params.set(KEYS.condition, filters.condition);
  if (filters.type) params.set(KEYS.type, filters.type);
  if (filters.yearFrom !== undefined) params.set(KEYS.yearFrom, String(filters.yearFrom));
  if (filters.yearTo !== undefined) params.set(KEYS.yearTo, String(filters.yearTo));
  if (filters.priceMin !== undefined) params.set(KEYS.priceMin, String(filters.priceMin));
  if (filters.priceMax !== undefined) params.set(KEYS.priceMax, String(filters.priceMax));
  if (filters.search) params.set(KEYS.search, filters.search);
  return params;
}

/** A search filter is an exact lookup, not a paged feed (see DB-design §5). */
export function isSearchFilter(filters: CarFilters): boolean {
  return !!filters.search && filters.search.trim() !== "";
}
