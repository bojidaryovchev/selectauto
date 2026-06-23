/**
 * Lambda: refreshListingDetail
 *
 * Flow 5 — detail refresh fallback. Intended for INTERNAL use (called by our
 * app backend or manually) when a detail page is stale or missing. Not wired to
 * any public endpoint by default — it is invoked directly via the AWS SDK
 * (lambda.invoke) or the console. See README if you want to expose it.
 *
 * Input (provide EITHER lot+domain OR vin):
 *   { "lot": "45289258", "domain": "iaai_com", "pricesHistory": true }
 *   { "vin": "WBA3B5G55FNS17722", "pricesHistory": true }
 *
 * Calls:
 *   GET /api/search-lot/{lot}/{domain}?prices_history=1
 *   GET /api/search-vin/{vin}?prices_history=1
 *
 * Upserts the returned detail (same car+lots shape) idempotently.
 */
import { AuctionsApiClient } from "../shared/auctionsApiClient.js";
import { upsertDetail } from "../shared/db.js";
import { Logger } from "../shared/logger.js";
import type { ApiCar, RefreshListingInput } from "../shared/types.js";

export const handler = async (
  input: RefreshListingInput,
): Promise<{
  ok: boolean;
  recordsUpserted: number;
  source: "lot" | "vin";
}> => {
  const client = new AuctionsApiClient();
  const pricesHistory = input.pricesHistory ?? true;
  const log = new Logger({ flowType: "detail_refresh" });

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
    throw new Error("refreshListingDetail requires either { lot, domain } or { vin }");
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
};

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
