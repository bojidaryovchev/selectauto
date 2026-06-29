/**
 * Lambda(s): drift-repair sweep — periodic projection self-heal.
 *
 * WHY THIS EXISTS: the ingestion hooks maintain car_listings / car_listings_archived
 * (and the car_listing_counts / car_listing_facets summaries) best-effort — a
 * recompute failure is logged and SWALLOWED so it can never fail the
 * source-of-truth cars/auction_lots write (see shared/db.ts recomputeListings and
 * docs/05 §11/§12). The cost of that safety is that a swallowed recompute leaves
 * the projection slightly stale until something re-derives it. Nothing did — the
 * audit found 9 stale rows in car_listings_archived (cars whose archived lot was
 * relisted to a non-concluded status but whose past-card was never removed).
 *
 * This sweep is that "something": a periodic FULL re-run of the projection
 * recompute over EVERY car, via the SAME *_counted wrappers the backfill uses, so
 * counts + facets are repaired too. It is the scheduled equivalent of running
 * `backfill-car-listings.mjs` — reusing the recompute (single source of truth for
 * the pick-strategy) rather than re-deriving anything here.
 *
 * Timeout-proof + resumable: a full walk of ~1.1M cars recomputes ~14 min of DB
 * work, too close to Lambda's 15-min cap, so we loop in Step Functions — ONE
 * car-id keyset window per invocation (driftSweepStepHandler), advancing a cursor
 * over cars.id. The loop is resumable via sync_runs.last_page_processed (= cursor)
 * and idempotent (recompute reads current state), so a retried/duplicated step is
 * harmless.
 *
 *   DriftSweepInit       -> create sync_runs row, cursor=0, hasMore=true
 *   HasMore? --yes--> SweepBatch (recompute next window) -> Wait -> HasMore?
 *            --no---> DriftSweepFinalize (mark succeeded)
 */
import { createSyncRun, fetchCarIdsAfter, recomputeProjectionsForCars, updateSyncRun } from "../shared/db.js";
import { Logger } from "../shared/logger.js";
import type { DriftSweepState, DriftSweepStepOutput } from "../shared/types.js";

/** Car-id window per step. Matches the backfill default; one batch ≈ ~19s of DB
 *  work (well under the step Lambda's 300s timeout). Overridable via env. */
const DEFAULT_BATCH_SIZE = Number(process.env.DRIFT_SWEEP_BATCH_SIZE ?? 25000);

interface DriftSweepInitInput {
  /** Optional override of the per-step car-id window (defaults to 25000). */
  batchSize?: number;
  /** Optional resume cursor (last cars.id processed); defaults to 0 (start). */
  startAfterId?: number;
}

/** DriftSweepInit: create the run row, return the initial loop state. */
export const driftSweepInitHandler = async (input: DriftSweepInitInput = {}): Promise<DriftSweepStepOutput> => {
  const batchSize = input.batchSize && input.batchSize > 0 ? input.batchSize : DEFAULT_BATCH_SIZE;
  const cursor = input.startAfterId && input.startAfterId > 0 ? input.startAfterId : 0;
  const syncRunId = await createSyncRun("drift_sweep", { mode: "looped", batchSize, startAfterId: cursor });
  const log = new Logger({ flowType: "drift_sweep", syncRunId });
  log.info("drift_sweep_init", { batchSize, cursor });

  return {
    flowType: "drift_sweep",
    syncRunId,
    cursor,
    batchSize,
    processed: 0,
    // The first batch is fetched by the step; assume there's work to do (an empty
    // table simply returns hasMore=false on the first step).
    hasMore: true,
  };
};

/** SweepBatch: recompute one car-id window, advance the cursor. */
export const driftSweepStepHandler = async (state: DriftSweepState): Promise<DriftSweepStepOutput> => {
  const log = new Logger({ flowType: "drift_sweep", syncRunId: state.syncRunId, cursor: state.cursor });

  const ids = await fetchCarIdsAfter(state.cursor, state.batchSize);
  if (ids.length === 0) {
    log.info("drift_sweep_complete", { processed: state.processed });
    return { ...state, hasMore: false };
  }

  const recomputed = await log.time("drift_sweep_recompute_batch", () => recomputeProjectionsForCars(ids), {
    count: ids.length,
  });

  const cursor = ids[ids.length - 1]; // keyset: highest id in this window
  const processed = state.processed + recomputed;

  // Checkpoint: last_page_processed doubles as the resume cursor for this flow.
  await updateSyncRun(state.syncRunId, {
    lastPageProcessed: cursor,
    recordsProcessedDelta: recomputed,
  });
  log.info("drift_sweep_batch_done", { recomputed, cursor, processed });

  return {
    ...state,
    cursor,
    processed,
    // A short window means we've reached the end of the table → stop next.
    hasMore: ids.length === state.batchSize,
  };
};

/** DriftSweepFinalize: mark the run succeeded. */
export const driftSweepFinalizeHandler = async (state: DriftSweepState): Promise<DriftSweepState> => {
  await updateSyncRun(state.syncRunId, { status: "succeeded", finished: true });
  new Logger({ flowType: "drift_sweep", syncRunId: state.syncRunId }).info("drift_sweep_done", {
    processed: state.processed,
  });
  return state;
};
