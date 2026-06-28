/**
 * Thin re-export / convenience wrapper around the sync_runs DB helpers.
 *
 * Kept as its own module so handlers can import sync-run concerns without
 * pulling the whole db surface, and so we have one obvious place to evolve
 * checkpoint/resume logic later.
 *
 * Resume/checkpointing (conceptual, basic in v1):
 *   - Every paginated run records last_page_processed as it advances.
 *   - To resume a failed full backfill, an operator can read the run's
 *     last_page_processed and start a new execution with page = that + 1.
 *   - A future version can make the state machine itself look up the latest
 *     failed run for a flow and auto-resume. See README "Resume".
 */
export { createSyncRun, updateSyncRun, type SyncRunUpdate } from "./db.js";

import { getPool } from "./db.js";
import type { FlowType } from "./types.js";

/**
 * Find the most recent run for a flow that did NOT finish (status='running' or
 * 'failed'), so an operator/UI can offer a resume point. Returns null if none.
 */
export async function findResumePoint(
  flowType: FlowType,
): Promise<{ syncRunId: number; lastPageProcessed: number } | null> {
  const db = getPool();
  const res = await db.query<{ id: number; last_page_processed: number }>(
    `SELECT id, last_page_processed
       FROM sync_runs
      WHERE flow_type = $1 AND status IN ('running', 'failed')
      ORDER BY started_at DESC
      LIMIT 1`,
    [flowType],
  );
  const row = res.rows[0];
  return row ? { syncRunId: row.id, lastPageProcessed: row.last_page_processed } : null;
}
