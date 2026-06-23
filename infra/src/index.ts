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

// Current AWS account ID (for scoping IAM resource ARNs to this account).
const accountId = aws.getCallerIdentityOutput({}).accountId;

// 1. Secrets Manager secrets (AUCTIONS_API_KEY, NEON_DATABASE_URL).
const secrets = createSecrets();

// 2. SQS FIFO queue for detail-refresh requests (rate-limit chokepoint).
const queues = createQueues();

// 3. Lambda execution role (logs + read secrets + consume the detail queue).
const { lambdaRole } = createLambdaRole(secretArns(secrets), [queues.detailRefreshQueue.arn]);

// 4. Lambdas. Secret VALUES are injected as env vars (from Pulumi config
//    secrets) so handlers don't need a runtime Secrets Manager call.
const lambdas = createLambdas(lambdaRole.arn, {
  auctionsApiKey: config.auctionsApiKey,
  neonDatabaseUrl: config.neonDatabaseUrl,
});

// The detail-refresh worker is driven by the SQS FIFO queue. batchSize 1 +
// ReportBatchItemFailures: each message succeeds/fails independently, and the
// worker's reservedConcurrency=1 keeps the whole thing serialized at ~1 req/sec.
new aws.lambda.EventSourceMapping("detail-refresh-esm", {
  eventSourceArn: queues.detailRefreshQueue.arn,
  functionName: lambdas.refreshListingDetail.arn,
  batchSize: 1,
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
const schedulerRole = createSchedulerRole([stateMachines.combinedHourlySync.arn, stateMachines.referenceSync.arn]);
const schedules = createSchedules({
  schedulerRoleArn: schedulerRole.arn,
  combinedHourlySyncArn: stateMachines.combinedHourlySync.arn,
  referenceSyncArn: stateMachines.referenceSync.arn,
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
  createSyncRun: lambdas.createSyncRun.name,
  finalizeSyncRun: lambdas.finalizeSyncRun.name,
  markSyncFailed: lambdas.markSyncFailed.name,
};

// Schedule names.
export const scheduleNames = {
  hourlyCombinedSync: schedules.hourlyCombinedSync.name,
  dailyReferenceSync: schedules.dailyReferenceSync.name,
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
