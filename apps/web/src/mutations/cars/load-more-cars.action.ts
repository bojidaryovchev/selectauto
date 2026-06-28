"use server";

import { getCarsPage } from "@/queries/cars";
import { safeParseCarFilters } from "@/schemas/car-filters.schema";
import type { CarsPage } from "@/types/car-filters.type";

/**
 * Server Action driving the catalog's infinite scroll. The client grid calls
 * this with the current filters + the last cursor; it returns the next page of
 * cars. A thin wrapper over the cached `getCarsPage` query (so SSR's first page
 * and these subsequent pages share the same cache entries).
 *
 * Filters are re-validated with `safeParseCarFilters` because a Server Action is
 * reachable by direct POST — never trust the client-supplied filter shape.
 * Returns `{ cars: [], nextCursor: null }` on bad input (terminates the scroll
 * gracefully) rather than throwing.
 */
export async function loadMoreCars(filters: unknown, cursor: string | null): Promise<CarsPage> {
  const safeFilters = safeParseCarFilters(filters);
  const safeCursor = typeof cursor === "string" && cursor.trim() !== "" ? cursor : null;
  return getCarsPage(safeFilters, safeCursor);
}
