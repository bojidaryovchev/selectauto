/**
 * US/Canada inland + container transport resolver.
 *
 * Resolves a car's (auction, location, vehicle type) to a shipping terminal,
 * inland price, container price and their total — all USD. Matching order follows
 * the техническо задание (docx §2): exact Auction+Location, then Auction+ZIP,
 * then Auction+City+State; unmatched → `notFound` (the caller must NOT invent a
 * total, docx §10).
 *
 * The tariff DATA is injectable: pass a `UsTariffData` (the active DB version) or
 * omit it to use the built-in static seed (`US_TARIFF_SEED`, generated from the
 * source workbook). Indexes are memoised per dataset reference, so repeated calls
 * with the same data are cheap.
 */

// Import only the tiny config map + the row TYPE — NOT the ~600-row arrays. This
// keeps the client bundle lean: the big seed lives in the server-only
// `data/us-transport-seed.ts`; the client fetches the active tariffs from
// /api/us-tariffs and passes them in. `data` is therefore a REQUIRED argument.
import { CONTAINER_CONFIG_BY_TYPE, type UsInlandTariff } from "@/data/us-transport-tariffs";

export type VehicleType = keyof typeof CONTAINER_CONFIG_BY_TYPE; // "sedan" | "suv"

/** A full tariff dataset — inland rows + the container price grid. */
export type UsTariffData = {
  inland: UsInlandTariff[];
  /** config → terminal → price-per-car (USD). */
  container: Record<string, Partial<Record<string, number>>>;
};

export type UsTransportResult =
  | { notFound: true }
  | {
      notFound: false;
      /** How the row was matched: exact location, ZIP, or city+state. */
      matchedBy: "location" | "zip" | "cityState";
      terminal: string;
      inland: number;
      containerConfig: string;
      container: number;
      /** inland + container, USD. */
      total: number;
    };

/** Collapse whitespace + lowercase for tolerant comparison. */
function key(s: string): string {
  return s.replace(/\s+/g, " ").trim().toLowerCase();
}

type Indexes = {
  byLocation: Map<string, UsInlandTariff>;
  byZip: Map<string, UsInlandTariff>;
  byCityState: Map<string, UsInlandTariff>;
};

/** Per-dataset memoised indexes (keyed by the data object's identity). */
const indexCache = new WeakMap<UsTariffData, Indexes>();

function indexesFor(data: UsTariffData): Indexes {
  const cached = indexCache.get(data);
  if (cached) return cached;

  const byLocation = new Map<string, UsInlandTariff>();
  const byZip = new Map<string, UsInlandTariff>();
  const byCityState = new Map<string, UsInlandTariff>();
  for (const row of data.inland) {
    const a = key(row.auction);
    // First write wins so an exact/earlier row isn't shadowed by a later duplicate.
    const locK = `${a}|${key(row.location)}`;
    if (!byLocation.has(locK)) byLocation.set(locK, row);
    if (row.zip) {
      const zipK = `${a}|${key(row.zip)}`;
      if (!byZip.has(zipK)) byZip.set(zipK, row);
    }
    if (row.city && row.state) {
      const csK = `${a}|${key(row.city)}|${key(row.state)}`;
      if (!byCityState.has(csK)) byCityState.set(csK, row);
    }
  }
  const built = { byLocation, byZip, byCityState };
  indexCache.set(data, built);
  return built;
}

/**
 * Resolve inland + container transport for a US/Canada auction car. `location`
 * is the auction location string (a value from the dataset); `zip`/`city`/`state`
 * feed only the fallback matches. Pass `data` to resolve against a specific
 * dataset (the active DB version); omit it to use the static seed.
 */
export function resolveUsTransport(
  input: {
    auction: string;
    location: string;
    vehicleType: VehicleType;
    zip?: string;
    city?: string;
    state?: string;
  },
  data: UsTariffData,
): UsTransportResult {
  const idx = indexesFor(data);
  const a = key(input.auction);

  let row: UsInlandTariff | undefined;
  let matchedBy: "location" | "zip" | "cityState" | null = null;

  if (input.location) {
    row = idx.byLocation.get(`${a}|${key(input.location)}`);
    if (row) matchedBy = "location";
  }
  if (!row && input.zip) {
    row = idx.byZip.get(`${a}|${key(input.zip)}`);
    if (row) matchedBy = "zip";
  }
  if (!row && input.city && input.state) {
    row = idx.byCityState.get(`${a}|${key(input.city)}|${key(input.state)}`);
    if (row) matchedBy = "cityState";
  }

  if (!row || !matchedBy) return { notFound: true };

  const containerConfig = CONTAINER_CONFIG_BY_TYPE[input.vehicleType];

  // Owner-quoted flat rows: the figure is ALL-IN to Holland for this vehicle
  // type — no container is added on top (container: 0 keeps every consumer's
  // inland+container arithmetic correct).
  if (row.flatUsdByType) {
    const total = row.flatUsdByType[input.vehicleType];
    return {
      notFound: false,
      matchedBy,
      terminal: row.terminal,
      inland: total,
      containerConfig,
      container: 0,
      total,
    };
  }

  const container = data.container[containerConfig]?.[row.terminal];
  if (container === undefined) return { notFound: true };

  return {
    notFound: false,
    matchedBy,
    terminal: row.terminal,
    inland: row.inland,
    containerConfig,
    container,
    total: row.inland + container,
  };
}

/** Digits-only first-5 of a zip ("18073 2303" → "18073"). */
function zip5(s: string): string {
  return s.replace(/[^0-9]/g, "").slice(0, 5);
}

/**
 * Find the dataset's location STRING for a car's auction yard — used to preselect
 * the calculator's location dropdown from a lot's raw location. The API's branch
 * names ("pa - philadelphia") don't match the workbook's location strings
 * ("PHILADELPHIA (PA) 18073"), so match by yard ZIP first (digits-only first 5 —
 * lot zips arrive as "18073 2303"), then by yard city+state. ~96% of live US
 * lots resolve (measured 2026-07-22); unmatched → undefined (manual pick).
 */
export function findUsLocation(
  seed: { zip?: string; city?: string; state?: string },
  auction: string,
  data: UsTariffData,
): string | undefined {
  const a = key(auction);
  if (seed.zip) {
    const z = zip5(seed.zip);
    if (z.length === 5) {
      for (const row of data.inland) {
        if (key(row.auction) === a && row.zip && zip5(row.zip) === z) return row.location;
      }
    }
  }
  if (seed.city && seed.state) {
    const c = key(seed.city);
    const st = key(seed.state);
    for (const row of data.inland) {
      if (key(row.auction) === a && key(row.city) === c && key(row.state) === st) return row.location;
    }
  }
  return undefined;
}

/** Distinct auctions present in the dataset (for the auction dropdown). */
export function usAuctions(data: UsTariffData): string[] {
  return [...new Set(data.inland.map((r) => r.auction))].sort();
}

/** Distinct location strings for a given auction (for the location dropdown). */
export function usLocationsForAuction(auction: string, data: UsTariffData): string[] {
  const a = key(auction);
  return data.inland
    .filter((r) => key(r.auction) === a)
    .map((r) => r.location)
    .sort();
}
