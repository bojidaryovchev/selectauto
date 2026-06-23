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

  return { detailRefreshQueue, detailRefreshDlq };
}
