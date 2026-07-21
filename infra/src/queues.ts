/**
 * SQS FIFO queue for detail-refresh requests.
 *
 * The backend enqueues "refresh this listing" requests here instead of invoking
 * the Lambda directly. A single-concurrency worker (see lambdas.ts) drains the
 * queue serially so the AuctionsAPI 1 req/sec budget can never be breached no
 * matter how many users trigger refreshes at once.
 *
 * FIFO + content-based dedup: duplicate requests for the same listing within the
 * 5-minute dedup window collapse into one. Failed messages retry, then land in
 * the DLQ after maxReceiveCount.
 */
import * as aws from "@pulumi/aws";
import { namePrefix, tags } from "./config";

export interface Queues {
  detailRefreshQueue: aws.sqs.Queue;
  detailRefreshDlq: aws.sqs.Queue;
  bakeThumbnailQueue: aws.sqs.Queue;
  bakeThumbnailDlq: aws.sqs.Queue;
}

export function createQueues(): Queues {
  // Dead-letter queue (FIFO too — DLQ must match the source queue type).
  const detailRefreshDlq = new aws.sqs.Queue("detail-refresh-dlq", {
    name: `${namePrefix}-detail-refresh-dlq.fifo`,
    fifoQueue: true,
    messageRetentionSeconds: 1209600, // 14 days
    tags,
  });

  const detailRefreshQueue = new aws.sqs.Queue("detail-refresh-queue", {
    name: `${namePrefix}-detail-refresh.fifo`,
    fifoQueue: true,
    // Dedup by message body: repeated refreshes of the same listing within the
    // dedup window (5 min) are collapsed into a single delivery.
    contentBasedDeduplication: true,
    // Visibility must exceed the worker's max processing time (pace + API call).
    visibilityTimeoutSeconds: 60,
    messageRetentionSeconds: 86400, // 1 day; stale refreshes aren't worth keeping
    redrivePolicy: detailRefreshDlq.arn.apply((dlqArn) =>
      JSON.stringify({ deadLetterTargetArn: dlqArn, maxReceiveCount: 5 }),
    ),
    tags,
  });

  // ── Thumbnail-bake queue (standard, NOT FIFO) ───────────────────────────────
  // The bake worker fetches from the source image CDN (not the rate-limited
  // AuctionsAPI /api), so it isn't bound by the 1 req/sec budget and can drain at
  // its own concurrency. Bakes are idempotent and order-independent (each message
  // is one lot id, content-addressed output), so a standard queue is correct —
  // and standard queues support SendMessageBatch cheaply for the enqueuers.
  const bakeThumbnailDlq = new aws.sqs.Queue("bake-thumbnail-dlq", {
    name: `${namePrefix}-bake-thumbnail-dlq`,
    messageRetentionSeconds: 1209600, // 14 days
    tags,
  });

  const bakeThumbnailQueue = new aws.sqs.Queue("bake-thumbnail-queue", {
    name: `${namePrefix}-bake-thumbnail`,
    // Must exceed the worker's max processing time (source fetch + resize + PutObject).
    visibilityTimeoutSeconds: 120,
    messageRetentionSeconds: 345600, // 4 days
    redrivePolicy: bakeThumbnailDlq.arn.apply((dlqArn) =>
      JSON.stringify({ deadLetterTargetArn: dlqArn, maxReceiveCount: 3 }),
    ),
    tags,
  });

  return { detailRefreshQueue, detailRefreshDlq, bakeThumbnailQueue, bakeThumbnailDlq };
}
