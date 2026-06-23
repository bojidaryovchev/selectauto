/**
 * Shared detail-refresh logic: fetch ONE listing from AuctionsAPI (by lot+domain
 * or VIN) and upsert it. Extracted so both the SQS drain worker and any direct
 * invocation share the exact same behaviour.
 *
 * IMPORTANT: this function does NOT throttle. The 1 req/sec budget is enforced by
 * the single, serialized drain worker that calls it (reserved concurrency = 1 +
 * pacing). Callers must respect that — do not call this from a fan-out.
 */
import { AuctionsApiClient } from "./auctionsApiClient.js";
import { upsertDetail } from "./db.js";
import { Logger } from "./logger.js";
import type { ApiCar, RefreshListingInput } from "./types.js";

export interface DetailRefreshResult {
  ok: boolean;
  recordsUpserted: number;
  source: "lot" | "vin";
}

export async function refreshOneListing(
  input: RefreshListingInput,
  log: Logger = new Logger({ flowType: "detail_refresh" }),
): Promise<DetailRefreshResult> {
  const client = new AuctionsApiClient();
  const pricesHistory = input.pricesHistory ?? true;

  let raw: unknown;
  let source: "lot" | "vin";

  if (input.lot && input.domain) {
    raw = await log.time("search_lot", () => client.searchLot(input.lot!, input.domain!, pricesHistory), {
      lot: input.lot,
      domain: input.domain,
    });
    source = "lot";
  } else if (input.vin) {
    raw = await log.time("search_vin", () => client.searchVin(input.vin!, pricesHistory), { vin: input.vin });
    source = "vin";
  } else {
    throw new Error("refreshOneListing requires either { lot, domain } or { vin }");
  }

  // Detail returns { data: <car object> } (same /cars shape, plus lots[].prices).
  const car = unwrapCar(raw);
  if (!car) {
    log.warn("detail_refresh_no_car", { source });
    return { ok: false, recordsUpserted: 0, source };
  }

  const recordsUpserted = await upsertDetail(car);
  log.info("detail_refresh_done", { source, recordsUpserted });
  return { ok: true, recordsUpserted, source };
}

function unwrapCar(raw: unknown): ApiCar | null {
  if (!raw || typeof raw !== "object") return null;
  const obj = raw as Record<string, unknown>;
  if (obj.data && typeof obj.data === "object" && !Array.isArray(obj.data)) {
    return obj.data as ApiCar;
  }
  if (Array.isArray(obj.data)) {
    return (obj.data[0] as ApiCar) ?? null;
  }
  // Assume the object itself is the car record.
  return obj as ApiCar;
}
