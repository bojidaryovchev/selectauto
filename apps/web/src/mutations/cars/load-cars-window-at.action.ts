"use server";

import { getCarsWindowByIndex } from "@/queries/cars";
import { safeParseCarFilters } from "@/schemas/car-filters.schema";
import type { CarsPage } from "@/types/car-filters.type";

/**
 * Server Action for the catalog's RANDOM-ACCESS jump — the user drags the
 * scrollbar (or hits End) to a spot far from the loaded window. The client grid
 * calls this with the current filters + the absolute feed index it jumped to; it
 * returns a fresh window seeded at that position (`cars` + both cursors) plus
 * `aboveCount`, the window's absolute depth. The client REPLACES its single
 * loaded window with this, so a jump costs one round-trip instead of the
 * hundreds of contiguous page loads it would take to walk there. A thin wrapper
 * over `getCarsWindowByIndex`.
 *
 * Filters are re-validated with `safeParseCarFilters` because a Server Action is
 * reachable by direct POST — never trust the client-supplied filter shape. A
 * non-finite/negative index degrades to the feed top (index 0).
 */
export async function loadCarsWindowAt(
  filters: unknown,
  index: number,
): Promise<CarsPage & { aboveCount: number }> {
  const safeFilters = safeParseCarFilters(filters);
  const safeIndex = Number.isFinite(index) && index > 0 ? Math.floor(index) : 0;
  return getCarsWindowByIndex(safeFilters, safeIndex);
}
