/**
 * Lambda: syncCarsPage  (merged fetch + upsert)
 *
 * Fetches ONE page of /api/cars AND upserts it into cars + auction_lots in the
 * SAME invocation, so the (potentially multi-MB) page never crosses Step
 * Functions state. Returns only small loop-control fields + counters.
 *
 * This replaces the old split fetchCarsPage -> upsertCarsPage, which failed with
 * Function.ResponseSizeTooLarge: a page of 1000 cars (with lots/images) exceeds
 * Lambda's 6 MB response limit and SFN's 256 KB state limit.
 *
 * Used by BOTH:
 *   - full backfill (mode='full', no minutes, per_page=1000)
 *   - hourly cars sync (mode='incremental', minutes=75, per_page=1000)
 *
 * Idempotent: upserts use ON CONFLICT, so a Step Functions retry that re-runs a
 * page produces no duplicates. The 1 req/sec pacing is still enforced by the
 * state machine's WaitOneSecond state between page syncs.
 */
import { AuctionsApiClient } from "../shared/auctionsApiClient.js";
import { updateSyncRun, upsertCarsAndLots } from "../shared/db.js";
import { loggerFromState } from "../shared/logger.js";
import { decideNextStep } from "../shared/pagination.js";
import type { PaginatedSyncState, SyncPageOutput } from "../shared/types.js";

export const handler = async (input: PaginatedSyncState): Promise<SyncPageOutput> => {
  const log = loggerFromState(input);
  const client = new AuctionsApiClient();

  // Only the incremental flows use a minutes window; full backfill omits it.
  // minutes may arrive as null (normalized by InitSyncRun) -> coerce to undefined.
  const minutes = input.mode === "incremental" ? (input.minutes ?? undefined) : undefined;

  // 1. Fetch the page (retryable on 429/5xx/network via the SFN Retry policy).
  const page = await log.time(
    "fetch_cars_page",
    () => client.getCarsPage({ page: input.page, perPage: input.perPage, minutes }),
    { perPage: input.perPage, minutes: minutes ?? null },
  );

  const decision = decideNextStep(page);

  // 2. Upsert in the same invocation; the page data never leaves this Lambda.
  const upsertedThisPage = await log.time("upsert_cars_page", () => upsertCarsAndLots(page.data), {
    carsIn: page.data.length,
  });

  const pagesProcessed = (input.pagesProcessed ?? 0) + 1;

  if (input.syncRunId) {
    await updateSyncRun(input.syncRunId, {
      pagesProcessed,
      lastPageProcessed: input.page,
      recordsProcessedDelta: upsertedThisPage,
    });
  }

  log.info("sync_cars_page_result", {
    itemCount: decision.itemCount,
    upsertedThisPage,
    hasNextPage: decision.hasNextPage,
    nextPage: decision.nextPage,
  });

  return {
    ...input,
    pagesProcessed,
    lastPageProcessed: input.page,
    recordsProcessed: (input.recordsProcessed ?? 0) + upsertedThisPage,
    upsertedThisPage,
    itemCount: decision.itemCount,
    hasNextPage: decision.hasNextPage,
    nextPage: decision.nextPage,
    lastPage: decision.lastPage,
  };
};
