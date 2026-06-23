/**
 * Lambda: syncRunLifecycle
 *
 * Two small exported handlers used by the Step Functions Init / Finalize /
 * MarkFailed states. Bundled together because they are tiny and share imports.
 *
 *   - createHandler:   InitSyncRun  -> inserts a sync_runs row, returns syncRunId
 *                      merged into the loop state so every later step can update it.
 *   - finalizeHandler: FinalizeSyncRun -> marks succeeded; or, when given an
 *                      error, MarkSyncFailed -> marks failed with the message.
 *
 * Keeping these as Lambdas (rather than SFN SDK service integrations) keeps the
 * state machine portable and the DB write logic in one place.
 */
import { createSyncRun, updateSyncRun } from "../shared/db.js";
import type { FlowType, PaginatedSyncState } from "../shared/types.js";

interface CreateInput extends PaginatedSyncState {
  flowType: FlowType;
}

/** InitSyncRun: create the run row, return state with syncRunId set. */
export const createHandler = async (input: CreateInput): Promise<PaginatedSyncState> => {
  const syncRunId = await createSyncRun(input.flowType, {
    mode: input.mode,
    perPage: input.perPage,
    minutes: input.minutes ?? null,
    startPage: input.page,
  });

  // Return a state where EVERY field the state machine's IncrementPage Pass
  // references ($.minutes, $.page, counters, ...) is always present. For the
  // full backfill `minutes` is not supplied; we emit it as null so the JSONPath
  // `$.minutes` resolves instead of failing with "path not found" at runtime.
  return {
    flowType: input.flowType,
    mode: input.mode,
    page: input.page ?? 1,
    perPage: input.perPage,
    minutes: input.minutes ?? null,
    syncRunId,
    pagesProcessed: 0,
    recordsProcessed: 0,
    lastPageProcessed: Math.max(0, (input.page ?? 1) - 1),
  };
};

interface FinalizeInput extends PaginatedSyncState {
  /** Present only on the failure path (injected by the Catch error object). */
  error?: { Error?: string; Cause?: string } | string;
}

/** FinalizeSyncRun: success path — mark the run succeeded. */
export const finalizeHandler = async (input: FinalizeInput): Promise<PaginatedSyncState> => {
  if (input.syncRunId) {
    await updateSyncRun(input.syncRunId, {
      status: "succeeded",
      pagesProcessed: input.pagesProcessed,
      lastPageProcessed: input.lastPageProcessed,
      finished: true,
    });
  }
  return input;
};

/** MarkSyncFailed: failure path — mark the run failed with the error message. */
export const failHandler = async (input: FinalizeInput): Promise<PaginatedSyncState> => {
  const errorMessage =
    typeof input.error === "string"
      ? input.error
      : JSON.stringify(input.error ?? { Error: "Unknown", Cause: "No error object provided" });

  if (input.syncRunId) {
    await updateSyncRun(input.syncRunId, {
      status: "failed",
      errorMessage: errorMessage.slice(0, 4000),
      finished: true,
    });
  }
  return input;
};
