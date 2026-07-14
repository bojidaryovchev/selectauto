"use server";

import { getPrevCarsPage } from "@/queries/cars";
import { safeParseCarFilters } from "@/schemas/car-filters.schema";
import type { CarsPage } from "@/types/car-filters.type";

/**
 * Server Action driving the catalog's REVERSE (upward) infinite scroll — the
 * counterpart to `loadMoreCars`. The client grid calls this with the current
 * filters + the top `prevCursor` when its rendered range touches not-yet-loaded
 * rows above the loaded window; the returned page of newer cars (still
 * newest-first) fills that reserved space in place. A thin wrapper over
 * `getPrevCarsPage`.
 *
 * Filters are re-validated with `safeParseCarFilters` because a Server Action is
 * reachable by direct POST — never trust the client-supplied filter shape.
 * Returns `{ cars: [], nextCursor: null, prevCursor: null }` on bad input
 * (terminates the upward scroll gracefully) rather than throwing.
 */
export async function loadPrevCars(filters: unknown, cursor: string | null): Promise<CarsPage> {
  const safeFilters = safeParseCarFilters(filters);
  const safeCursor = typeof cursor === "string" && cursor.trim() !== "" ? cursor : null;
  return getPrevCarsPage(safeFilters, safeCursor);
}
