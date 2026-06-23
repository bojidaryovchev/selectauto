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
import { createSchedules } from "./schedules";
import { createSecrets, secretArns } from "./secrets";
import { createStateMachines } from "./step-functions";

// 1. Secrets Manager secrets (AUCTIONS_API_KEY, NEON_DATABASE_URL).
const secrets = createSecrets();

// 2. Lambda execution role (logs + read those secrets).
const { lambdaRole } = createLambdaRole(secretArns(secrets));

// 3. Lambdas. Secret VALUES are injected as env vars (from Pulumi config
//    secrets) so handlers don't need a runtime Secrets Manager call.
const lambdas = createLambdas(lambdaRole.arn, {
  auctionsApiKey: config.auctionsApiKey,
  neonDatabaseUrl: config.neonDatabaseUrl,
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
        Effect: "Allow",
        Action: ["events:PutTargets", "events:PutRule", "events:DescribeRule"],
        Resource: pulumi.interpolate`arn:aws:events:${aws.config.region}:*:rule/StepFunctionsGetEventsForStepFunctionsExecutionRule`,
      },
    ],
  }),
});

// 5. State machines (backfill, hourly cars, archived lots, combined).
const stateMachines = createStateMachines(lambdas, sfnRole.arn);

// 6. EventBridge Scheduler role + schedules.
const schedulerRole = createSchedulerRole(
  // Scheduler starts the combined machine...
  [stateMachines.combinedHourlySync.arn],
  // ...and invokes the reference-sync Lambda.
  [lambdas.syncReferenceData.arn],
);
const schedules = createSchedules({
  schedulerRoleArn: schedulerRole.arn,
  combinedHourlySyncArn: stateMachines.combinedHourlySync.arn,
  syncReferenceDataArn: lambdas.syncReferenceData.arn,
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
};

// Lambda function names.
export const lambdaNames = {
  syncCarsPage: lambdas.syncCarsPage.name,
  syncArchivedLotsPage: lambdas.syncArchivedLotsPage.name,
  syncReferenceData: lambdas.syncReferenceData.name,
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
