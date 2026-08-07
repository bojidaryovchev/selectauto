import type { UsTariffData } from "@/lib/us-transport";
import { OWNER_QUOTED_YARDS } from "@/data/us-transport-owner-yards";
import { US_CONTAINER_PRICES, US_INLAND_TARIFFS } from "@/data/us-transport-tariffs";

/**
 * The built-in fallback tariff dataset: the generated workbook rows plus the
 * hand-maintained owner-quoted yards the workbook omits. Used by the server
 * `getUsTariffs` query when no active DB version exists / the DB is unreachable.
 *
 * Owner yards go LAST — index building is first-write-wins, so a real workbook
 * row for the same yard would take precedence over the hand-added quote.
 *
 * Kept in its OWN module (not `us-transport.ts`) so the ~600-row arrays are only
 * pulled into the SERVER bundle — the client resolver imports the logic without
 * the data and receives the active tariffs via /api/us-tariffs.
 */
export const US_TARIFF_SEED: UsTariffData = {
  inland: [...US_INLAND_TARIFFS, ...OWNER_QUOTED_YARDS],
  container: US_CONTAINER_PRICES,
};
