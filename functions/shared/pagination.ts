/**
 * Pagination loop-control helpers shared by the fetch Lambdas.
 *
 * The actual Step Functions state machine decides whether to loop based on the
 * `hasNextPage` boolean these helpers compute. Centralizing the stop conditions
 * here keeps the three paginated flows consistent.
 *
 * Stop conditions (any one ends the loop):
 *   1. The returned data array is empty.
 *   2. Metadata says current_page >= last_page.
 *   3. There is no next page link/number.
 */
import type { NormalizedPage } from "./types.js";

export interface LoopDecision {
  hasNextPage: boolean;
  nextPage: number | null;
  lastPage: number | null;
  itemCount: number;
}

/**
 * Combine the client's normalized signals with the "empty array => stop" rule.
 * Even when the API claims hasNextPage, an empty data array forces a stop so we
 * never loop forever on a bad metadata response.
 */
export function decideNextStep<T>(page: NormalizedPage<T>): LoopDecision {
  const itemCount = page.data.length;

  // Hard stop on empty page regardless of metadata.
  if (itemCount === 0) {
    return { hasNextPage: false, nextPage: null, lastPage: page.lastPage, itemCount };
  }

  return {
    hasNextPage: page.hasNextPage,
    nextPage: page.hasNextPage ? page.nextPage : null,
    lastPage: page.lastPage,
    itemCount,
  };
}
