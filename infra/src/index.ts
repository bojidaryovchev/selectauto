/**
 * Pulumi entrypoint for the AuctionsAPI ingestion infrastructure.
 *
 * Wires together: secrets -> IAM -> Lambdas -> Step Functions -> Schedules,
 * then exports the ARNs/names operators need.
 *
 * Backend: this stack uses the S3 state backend + passphrase encryption pattern
 * from the ecommerce-store project (see infra/bootstrap-pulumi-backend.ps1 and
 * the README). AWS auth is via your SSO profile ($env:AWS_PROFILE) locally and
 * GitHub OIDC in CI (infra/bootstrap-github-oidc.ps1).
 */
import * as aws from "@pulumi/aws";
import * as pulumi from "@pulumi/pulumi";
import { config, namePrefix } from "./config";
import { createLambdaRole, createSchedulerRole, createStepFunctionsRole } from "./iam";
import { allLambdaArns, createLambdas } from "./lambdas";
import { createQueues } from "./queues";
import { createSchedules } from "./schedules";
import { createSecrets, secretArns } from "./secrets";
import { createStateMachines } from "./step-functions";
import { createStorage } from "./storage";

// Current AWS account ID (for scoping IAM resource ARNs to this account).
const accountId = aws.getCallerIdentityOutput({}).accountId;

// 1. Secrets Manager secrets (AUCTIONS_API_KEY, NEON_DATABASE_URL).
const secrets = createSecrets();

// 2. SQS queues: FIFO detail-refresh (rate-limit chokepoint) + standard bake queue.
const queues = createQueues();

// 2b. Thumbnail storage: private S3 bucket + CloudFront (the bake worker writes
//     here; the web app serves card thumbnails directly from CloudFront).
const storage = createStorage();

// 3. Lambda execution role: logs + read secrets + consume the detail/bake queues
//    + send to the bake queue (enqueuers) + PutObject into the thumbnail bucket.
const { lambdaRole } = createLambdaRole(
  secretArns(secrets),
  [queues.detailRefreshQueue.arn, queues.bakeThumbnailQueue.arn],
  [queues.bakeThumbnailQueue.arn],
  [pulumi.interpolate`${storage.thumbnailBucket.arn}/thumb/*`],
);

// 4. Lambdas. Secret VALUES are injected as env vars (from Pulumi config
//    secrets) so handlers don't need a runtime Secrets Manager call.
const lambdas = createLambdas(
  lambdaRole.arn,
  {
    auctionsApiKey: config.auctionsApiKey,
    neonDatabaseUrl: config.neonDatabaseUrl,
  },
  {
    bakeQueueUrl: queues.bakeThumbnailQueue.url,
    thumbnailBucket: storage.thumbnailBucket.bucket,
    thumbnailCdnBaseUrl: storage.cdnBaseUrl,
  },
);

// The detail-refresh worker is driven by the SQS FIFO queue. batchSize 1 +
// ReportBatchItemFailures: each message succeeds/fails independently, and the
// worker's reservedConcurrency=1 keeps the whole thing serialized at ~1 req/sec.
new aws.lambda.EventSourceMapping("detail-refresh-esm", {
  eventSourceArn: queues.detailRefreshQueue.arn,
  functionName: lambdas.refreshListingDetail.arn,
  batchSize: 1,
  functionResponseTypes: ["ReportBatchItemFailures"],
});

// Thumbnail-bake worker drains the standard bake queue. batchSize 10 +
// ReportBatchItemFailures so a single bad message doesn't fail the whole batch;
// no reservedConcurrency (the bake fetches the source-image CDN, not the
// rate-limited AuctionsAPI, so it may run concurrently).
new aws.lambda.EventSourceMapping("bake-thumbnail-esm", {
  eventSourceArn: queues.bakeThumbnailQueue.arn,
  functionName: lambdas.bakeThumbnail.arn,
  // 25 lots per invocation, processed concurrently inside the handler (see
  // bakeThumbnail: each bake is network-bound, so a bigger parallel batch drains
  // far more per Lambda slot). SQS requires a batching window once batchSize > 10.
  batchSize: 25,
  maximumBatchingWindowInSeconds: 2,
  // Cap fan-out so we don't overwhelm the SOURCE image CDN (i.auctionsapi.com) or
  // Neon's pooled endpoint — 80 × 25 in-flight is already very high throughput and
  // stays stable (the earlier uncapped ramp caused connect timeouts → DLQ churn).
  scalingConfig: { maximumConcurrency: 80 },
  functionResponseTypes: ["ReportBatchItemFailures"],
});

// 4. Step Functions role (invoke our Lambdas + manage cross-machine executions).
const sfnRole = createStepFunctionsRole(allLambdaArns(lambdas));

// The combined hourly machine starts the two child machines synchronously
// (startExecution.sync:2), which additionally requires StartExecution,
// DescribeExecution, StopExecution, and the managed EventBridge rule for sync
// callbacks. Grant these to the SFN role.
new aws.iam.RolePolicy("ingestion-sfn-nested-exec", {
  role: sfnRole.id,
  policy: pulumi.jsonStringify({
    Version: "2012-10-17",
    Statement: [
      {
        Effect: "Allow",
        Action: ["states:StartExecution", "states:DescribeExecution", "states:StopExecution"],
        Resource: "*",
      },
      {
        // Required for the .sync integration to receive completion events.
        // Scoped to the managed rule in THIS account/region (not a wildcard).
        Effect: "Allow",
        Action: ["events:PutTargets", "events:PutRule", "events:DescribeRule"],
        Resource: pulumi.interpolate`arn:aws:events:${aws.config.region}:${accountId}:rule/StepFunctionsGetEventsForStepFunctionsExecutionRule`,
      },
    ],
  }),
});

// 5. State machines (backfill, hourly cars, archived lots, combined).
const stateMachines = createStateMachines(lambdas, sfnRole.arn);

// 6. EventBridge Scheduler role + schedules. Both schedules start a state
//    machine (hourly combined, daily reference loop) — no Lambda targets.
const schedulerRole = createSchedulerRole([
  stateMachines.combinedHourlySync.arn,
  stateMachines.referenceSync.arn,
  stateMachines.driftSweep.arn,
]);
const schedules = createSchedules({
  schedulerRoleArn: schedulerRole.arn,
  combinedHourlySyncArn: stateMachines.combinedHourlySync.arn,
  referenceSyncArn: stateMachines.referenceSync.arn,
  driftSweepArn: stateMachines.driftSweep.arn,
});

/* ===========================================================================
 * Outputs
 * ======================================================================== */

export const region = aws.config.region;
export const prefix = namePrefix;

// State machine ARNs.
export const stateMachineArns = {
  fullInventoryBackfill: stateMachines.fullInventoryBackfill.arn,
  hourlyCarsSync: stateMachines.hourlyCarsSync.arn,
  archivedLotsSync: stateMachines.archivedLotsSync.arn,
  combinedHourlySync: stateMachines.combinedHourlySync.arn,
  referenceSync: stateMachines.referenceSync.arn,
  driftSweep: stateMachines.driftSweep.arn,
};

// Lambda function names.
export const lambdaNames = {
  syncCarsPage: lambdas.syncCarsPage.name,
  syncArchivedLotsPage: lambdas.syncArchivedLotsPage.name,
  syncReferenceData: lambdas.syncReferenceData.name,
  referenceInit: lambdas.referenceInit.name,
  referenceManufacturer: lambdas.referenceManufacturer.name,
  referenceFinalize: lambdas.referenceFinalize.name,
  refreshListingDetail: lambdas.refreshListingDetail.name,
  bakeThumbnail: lambdas.bakeThumbnail.name,
  createSyncRun: lambdas.createSyncRun.name,
  finalizeSyncRun: lambdas.finalizeSyncRun.name,
  markSyncFailed: lambdas.markSyncFailed.name,
  driftSweepInit: lambdas.driftSweepInit.name,
  driftSweepStep: lambdas.driftSweepStep.name,
  driftSweepFinalize: lambdas.driftSweepFinalize.name,
};

// Schedule names.
export const scheduleNames = {
  hourlyCombinedSync: schedules.hourlyCombinedSync.name,
  dailyReferenceSync: schedules.dailyReferenceSync.name,
  weeklyDriftSweep: schedules.weeklyDriftSweep.name,
};

// Secret names (NOT values).
export const secretNames = {
  auctionsApiKey: secrets.auctionsApiKeySecret.name,
  neonDatabaseUrl: secrets.neonDatabaseUrlSecret.name,
};

// Detail-refresh queue. The app backend enqueues "refresh this listing" requests
// to detailRefreshQueueUrl (FIFO: include MessageGroupId, e.g. "auctionsapi").
export const detailRefreshQueueUrl = queues.detailRefreshQueue.url;
export const detailRefreshQueueArn = queues.detailRefreshQueue.arn;
export const detailRefreshDlqUrl = queues.detailRefreshDlq.url;

// Thumbnail-bake queue. The ingestion enqueuers batch-send lot ids here; the
// backfill script (packages/db/backfill-thumbnails.mjs) also uses this URL.
export const bakeThumbnailQueueUrl = queues.bakeThumbnailQueue.url;
export const bakeThumbnailQueueArn = queues.bakeThumbnailQueue.arn;
export const bakeThumbnailDlqUrl = queues.bakeThumbnailDlq.url;

// Thumbnail storage. `thumbnailCdnBaseUrl` is the CloudFront origin the web app
// loads card thumbnails from (add it to the app's env if referenced there).
export const thumbnailBucketName = storage.thumbnailBucket.bucket;
export const thumbnailCdnBaseUrl = storage.cdnBaseUrl;
export const thumbnailCdnDistributionId = storage.distribution.id;
