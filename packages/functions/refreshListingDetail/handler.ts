/**
 * Lambda: refreshListingDetail  (SQS FIFO drain worker)
 *
 * Flow 5 — detail refresh, now rate-limit-safe.
 *
 * WHY A QUEUE: this Lambda used to be invoked directly by the backend. That
 * bypassed the 1 req/sec budget entirely — N concurrent users opening detail
 * pages meant N concurrent AuctionsAPI calls, breaching the limit and starving
 * the bulk sync. Now the backend ENQUEUES a request to an SQS FIFO queue and
 * THIS worker drains it serially:
 *
 *   - The queue is FIFO with a single MessageGroupId, so messages are strictly
 *     ordered and processed one at a time.
 *   - The function has reservedConcurrency = 1 (set in infra), so AWS never runs
 *     two copies. 1000 enqueued requests still drain one-by-one.
 *   - Content-based dedup on the queue collapses duplicate requests for the same
 *     listing within the dedup window into a single API call.
 *   - We pace each message to ~1 req/sec via a trailing sleep.
 *
 * Net effect: no number of users can exceed the rate limit; they just get an
 * eventual (seconds-later) refresh instead of a synchronous one.
 *
 * Message body (JSON), matching RefreshListingInput:
 *   { "lot": "45289258", "domain": "iaai_com", "pricesHistory": true }
 *   { "vin": "WBA3B5G55FNS17722", "pricesHistory": true }
 *
 * Batch handling: configured with batchSize 1 + ReportBatchItemFailures, so a
 * failed message is retried by SQS (and eventually dead-lettered) without
 * blocking others.
 */
import type { SQSBatchResponse, SQSEvent } from "aws-lambda";
import { refreshOneListing } from "../shared/detailRefresh.js";
import { Logger } from "../shared/logger.js";
import type { RefreshListingInput } from "../shared/types.js";

// Pace per processed message. The drain worker is single-concurrency, so this
// trailing delay keeps detail refreshes at/below ~1 req/sec. Configurable so it
// can be lowered to yield budget to the bulk sync (see README rate-limit note).
const PACE_MS = Number(process.env.DETAIL_REFRESH_PACE_MS ?? 1000);

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export const handler = async (event: SQSEvent): Promise<SQSBatchResponse> => {
  const failures: { itemIdentifier: string }[] = [];

  for (const record of event.Records) {
    const log = new Logger({ flowType: "detail_refresh", messageId: record.messageId });
    try {
      const input = JSON.parse(record.body) as RefreshListingInput;
      await refreshOneListing(input, log);
    } catch (err) {
      // Mark THIS message for SQS retry; don't fail the whole batch.
      log.error("detail_refresh_message_failed", { error: (err as Error).message });
      failures.push({ itemIdentifier: record.messageId });
    } finally {
      // Pace regardless of success/failure so retries also stay within budget.
      await sleep(PACE_MS);
    }
  }

  return { batchItemFailures: failures };
};
