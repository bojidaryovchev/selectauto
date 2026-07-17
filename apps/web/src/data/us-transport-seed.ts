import type { UsTariffData } from "@/lib/us-transport";
import { US_CONTAINER_PRICES, US_INLAND_TARIFFS } from "@/data/us-transport-tariffs";

/**
 * The built-in fallback tariff dataset (the generated seed). Used by the server
 * `getUsTariffs` query when no active DB version exists / the DB is unreachable.
 *
 * Kept in its OWN module (not `us-transport.ts`) so the ~600-row arrays are only
 * pulled into the SERVER bundle — the client resolver imports the logic without
 * the data and receives the active tariffs via /api/us-tariffs.
 */
export const US_TARIFF_SEED: UsTariffData = {
  inland: US_INLAND_TARIFFS,
  container: US_CONTAINER_PRICES,
};
