/**
 * Lambda: syncArchivedLotsPage  (merged fetch + archive)
 *
 * Fetches ONE page of /api/archived-lots AND marks the lots archived in the SAME
 * invocation, so the page never crosses Step Functions state. Returns only small
 * loop-control fields + counters. Replaces the split
 * fetchArchivedLotsPage -> archiveLotsPage (see syncCarsPage for the rationale).
 *
 * /api/archived-lots returns FLAT lot records (ApiArchivedLot), not car+lots.
 * archiveLots() never hard-deletes; it sets archived=TRUE + archived_at and
 * updates status/prices. Idempotent.
 */
import { AuctionsApiClient } from "../shared/auctionsApiClient.js";
import { archiveLots, updateSyncRun } from "../shared/db.js";
import { loggerFromState } from "../shared/logger.js";
import { decideNextStep } from "../shared/pagination.js";
import type { PaginatedSyncState, SyncPageOutput } from "../shared/types.js";

export const handler = async (input: PaginatedSyncState): Promise<SyncPageOutput> => {
  const log = loggerFromState(input);
  const client = new AuctionsApiClient();

  const minutes = input.mode === "incremental" ? (input.minutes ?? undefined) : undefined;

  const page = await log.time(
    "fetch_archived_lots_page",
    () => client.getArchivedLotsPage({ page: input.page, perPage: input.perPage, minutes }),
    { perPage: input.perPage, minutes: minutes ?? null },
  );

  const decision = decideNextStep(page);

  const archivedThisPage = await log.time("archive_lots_page", () => archiveLots(page.data), {
    lotsIn: page.data.length,
  });

  const pagesProcessed = (input.pagesProcessed ?? 0) + 1;

  if (input.syncRunId) {
    await updateSyncRun(input.syncRunId, {
      pagesProcessed,
      lastPageProcessed: input.page,
      recordsProcessedDelta: archivedThisPage,
    });
  }

  log.info("sync_archived_lots_page_result", {
    itemCount: decision.itemCount,
    archivedThisPage,
    hasNextPage: decision.hasNextPage,
    nextPage: decision.nextPage,
  });

  return {
    ...input,
    pagesProcessed,
    lastPageProcessed: input.page,
    recordsProcessed: (input.recordsProcessed ?? 0) + archivedThisPage,
    upsertedThisPage: archivedThisPage,
    itemCount: decision.itemCount,
    hasNextPage: decision.hasNextPage,
    nextPage: decision.nextPage,
    lastPage: decision.lastPage,
  };
};
