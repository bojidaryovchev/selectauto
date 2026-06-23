/**
 * Step Functions state machines for paginated, rate-limited ingestion.
 *
 * Shared loop shape (used by cars + archived-lots):
 *
 *   InitSyncRun
 *     -> SyncPage                        (fetch + upsert in ONE Lambda; the page
 *           -> HasNextPage?               data never crosses Step Functions state)
 *                 |  --no-->  FinalizeSyncRun -> Succeed
 *                 |yes
 *                 v
 *              WaitOneSecond             (enforces the 1 req/sec rate limit)
 *                 -> IncrementPage
 *                    -> SyncPage         (loop)
 *
 *   Any task error -> Catch -> MarkSyncFailed -> Fail
 *
 * Key requirements honored:
 *   - Pages processed SEQUENTIALLY (no Map / no parallel fetch).
 *   - Wait 1 second between page syncs.
 *   - Retry policies for 429, 5xx, and Lambda transient failures.
 *   - Page number, perPage, minutes, and mode threaded between states.
 *   - Stops on: no next page OR empty data array (AuctionsAPI has no last_page;
 *     both collapse into the single `hasNextPage` boolean computed by the
 *     sync Lambda via shared/pagination.ts).
 */
import * as aws from "@pulumi/aws";
import * as pulumi from "@pulumi/pulumi";
import { config, namePrefix, tags } from "./config";
import type { LambdaSet } from "./lambdas";

export interface StateMachines {
  fullInventoryBackfill: aws.sfn.StateMachine;
  hourlyCarsSync: aws.sfn.StateMachine;
  archivedLotsSync: aws.sfn.StateMachine;
  combinedHourlySync: aws.sfn.StateMachine;
}

/**
 * Retry policy applied to every Lambda task. The fetch Lambda surfaces
 * AuctionsApiError; we retry broadly on transient categories. The custom error
 * names let us tune behavior, but States.ALL is the catch-all backstop.
 */
const TASK_RETRY = [
  {
    // AuctionsAPI transient (429 + 5xx) and network errors. The handler throws
    // AuctionsApiError; Step Functions matches on the JS error name.
    ErrorEquals: ["AuctionsApiError"],
    IntervalSeconds: 2,
    MaxAttempts: 6,
    BackoffRate: 2.0,
    MaxDelaySeconds: 60,
  },
  {
    // Lambda transient/infra failures (throttles, init, timeouts).
    ErrorEquals: [
      "Lambda.ServiceException",
      "Lambda.AWSLambdaException",
      "Lambda.SdkClientException",
      "Lambda.TooManyRequestsException",
      "States.TaskFailed",
    ],
    IntervalSeconds: 2,
    MaxAttempts: 4,
    BackoffRate: 2.0,
  },
];

/** A single Lambda Task state using the lambda:invoke optimized integration. */
function lambdaTask(opts: {
  fnArn: pulumi.Input<string>;
  next?: string;
  end?: boolean;
  resultPath?: string;
  /** Override/extend the default retry list. */
  retry?: unknown[];
  /** Optional catch routing all errors to a state, capturing into $.error. */
  catchTo?: string;
}): Record<string, unknown> {
  const state: Record<string, unknown> = {
    Type: "Task",
    Resource: "arn:aws:states:::lambda:invoke",
    Parameters: {
      FunctionName: opts.fnArn,
      // Pass the whole state object as the Lambda payload.
      "Payload.$": "$",
    },
    // The optimized integration wraps the result in { Payload, ... }. Unwrap it
    // back onto the state so downstream states see the handler's return value.
    ResultSelector: { "value.$": "$.Payload" },
    ResultPath: opts.resultPath ?? "$.taskResult",
    Retry: opts.retry ?? TASK_RETRY,
  };
  if (opts.catchTo) {
    state.Catch = [
      {
        ErrorEquals: ["States.ALL"],
        ResultPath: "$.error",
        Next: opts.catchTo,
      },
    ];
  }
  if (opts.end) state.End = true;
  else if (opts.next) state.Next = opts.next;
  return state;
}

/**
 * Build the ASL definition for a paginated loop, parameterized by the single
 * merged sync Lambda (fetch + write in one invocation). The page data never
 * crosses Step Functions state — the Lambda returns only loop-control fields.
 * Returned as a pulumi Output<string> because the Lambda ARNs are Outputs.
 */
function buildPaginatedDefinition(args: {
  syncFnArn: pulumi.Input<string>;
  createFnArn: pulumi.Input<string>;
  finalizeFnArn: pulumi.Input<string>;
  failFnArn: pulumi.Input<string>;
}): pulumi.Output<string> {
  return pulumi
    .all([args.syncFnArn, args.createFnArn, args.finalizeFnArn, args.failFnArn])
    .apply(([syncArn, createArn, finalizeArn, failArn]) => {
      const definition = {
        Comment: "Paginated, rate-limited AuctionsAPI ingestion loop",
        StartAt: "InitSyncRun",
        States: {
          // 1. InitSyncRun — create the sync_runs row, merge syncRunId into state.
          InitSyncRun: {
            ...lambdaTask({ fnArn: createArn, resultPath: "$.init", catchTo: "MarkSyncFailed" }),
            // Pull the handler's returned state (with syncRunId) up to the root.
            OutputPath: "$.init.value",
            Next: "SyncPage",
          },

          // 2. SyncPage — fetch + upsert one page in a single Lambda. The page
          // data stays inside the Lambda; only small counters/flags return here.
          // Retries on 429/5xx/transient via the Retry policy.
          SyncPage: {
            ...lambdaTask({ fnArn: syncArn, resultPath: "$.sync", catchTo: "MarkSyncFailed" }),
            OutputPath: "$.sync.value",
            Next: "HasNextPage",
          },

          // 3. HasNextPage? — branch on the single boolean computed upstream.
          HasNextPage: {
            Type: "Choice",
            Choices: [
              {
                Variable: "$.hasNextPage",
                BooleanEquals: true,
                Next: "WaitOneSecond",
              },
            ],
            Default: "FinalizeSyncRun",
          },

          // 4. WaitOneSecond — the rate limiter (1 req/sec between page syncs).
          WaitOneSecond: {
            Type: "Wait",
            Seconds: 1,
            Next: "IncrementPage",
          },

          // 5. IncrementPage — advance page = nextPage for the next sync.
          IncrementPage: {
            Type: "Pass",
            Parameters: {
              // Carry everything forward, overriding `page` with nextPage.
              "flowType.$": "$.flowType",
              "mode.$": "$.mode",
              "perPage.$": "$.perPage",
              "minutes.$": "$.minutes",
              "syncRunId.$": "$.syncRunId",
              "page.$": "$.nextPage",
              "pagesProcessed.$": "$.pagesProcessed",
              "recordsProcessed.$": "$.recordsProcessed",
              "lastPageProcessed.$": "$.lastPageProcessed",
            },
            Next: "SyncPage",
          },

          // 7/8. FinalizeSyncRun — mark succeeded.
          FinalizeSyncRun: {
            ...lambdaTask({ fnArn: finalizeArn, resultPath: "$.finalize" }),
            OutputPath: "$.finalize.value",
            Next: "Succeed",
          },

          Succeed: { Type: "Succeed" },

          // 9. MarkSyncFailed — record the failure, then fail the execution.
          MarkSyncFailed: {
            ...lambdaTask({ fnArn: failArn, resultPath: "$.failResult" }),
            Next: "Fail",
          },

          Fail: { Type: "Fail", Error: "IngestionFailed", Cause: "See sync_runs.error_message" },
        },
      };

      return JSON.stringify(definition);
    });
}

/** CloudWatch log group + logging config for a state machine. */
function sfnLogGroup(name: string): aws.cloudwatch.LogGroup {
  return new aws.cloudwatch.LogGroup(`${name}-logs`, {
    name: `/aws/vendedlogs/states/${namePrefix}-${name}`,
    retentionInDays: config.logRetentionDays,
    tags,
  });
}

export function createStateMachines(lambdas: LambdaSet, sfnRoleArn: pulumi.Input<string>): StateMachines {
  const common = {
    createFnArn: lambdas.createSyncRun.arn,
    finalizeFnArn: lambdas.finalizeSyncRun.arn,
    failFnArn: lambdas.markSyncFailed.arn,
  };

  const mkLogging = (lg: aws.cloudwatch.LogGroup) => ({
    loggingConfiguration: {
      level: "ERROR" as const,
      includeExecutionData: true,
      logDestination: pulumi.interpolate`${lg.arn}:*`,
    },
  });

  // --- Flow 1: full inventory backfill (cars, mode=full) ---
  const backfillLog = sfnLogGroup("full-backfill");
  const fullInventoryBackfill = new aws.sfn.StateMachine("full-inventory-backfill", {
    name: `${namePrefix}-full-inventory-backfill`,
    roleArn: sfnRoleArn,
    type: "STANDARD",
    definition: buildPaginatedDefinition({
      syncFnArn: lambdas.syncCarsPage.arn,
      ...common,
    }),
    ...mkLogging(backfillLog),
    tags,
  });

  // --- Flow 2: hourly active cars sync (cars, mode=incremental) ---
  const carsLog = sfnLogGroup("hourly-cars");
  const hourlyCarsSync = new aws.sfn.StateMachine("hourly-cars-sync", {
    name: `${namePrefix}-hourly-cars-sync`,
    roleArn: sfnRoleArn,
    type: "STANDARD",
    definition: buildPaginatedDefinition({
      syncFnArn: lambdas.syncCarsPage.arn,
      ...common,
    }),
    ...mkLogging(carsLog),
    tags,
  });

  // --- Flow 3: hourly archived lots sync (archived-lots, mode=incremental) ---
  const archivedLog = sfnLogGroup("archived-lots");
  const archivedLotsSync = new aws.sfn.StateMachine("archived-lots-sync", {
    name: `${namePrefix}-archived-lots-sync`,
    roleArn: sfnRoleArn,
    type: "STANDARD",
    definition: buildPaginatedDefinition({
      syncFnArn: lambdas.syncArchivedLotsPage.arn,
      ...common,
    }),
    ...mkLogging(archivedLog),
    tags,
  });

  // --- Optional: combined hourly sync — run active cars, THEN archived lots ---
  // Implemented by nesting both child machines via StartExecution.sync:2 so the
  // 1 req/sec budget is never spent by two flows at once.
  const combinedLog = sfnLogGroup("combined-hourly");
  const combinedDefinition = pulumi.all([hourlyCarsSync.arn, archivedLotsSync.arn]).apply(([carsArn, archivedArn]) =>
    JSON.stringify({
      Comment: "Run active cars sync, then archived lots sync, sequentially.",
      StartAt: "RunCarsSync",
      States: {
        RunCarsSync: {
          Type: "Task",
          Resource: "arn:aws:states:::states:startExecution.sync:2",
          Parameters: {
            StateMachineArn: carsArn,
            Input: {
              flowType: "hourly_cars",
              mode: "incremental",
              page: 1,
              perPage: config.perPage,
              minutes: config.incrementalMinutes,
            },
          },
          Retry: [{ ErrorEquals: ["States.ALL"], IntervalSeconds: 5, MaxAttempts: 2, BackoffRate: 2.0 }],
          Next: "RunArchivedSync",
        },
        RunArchivedSync: {
          Type: "Task",
          Resource: "arn:aws:states:::states:startExecution.sync:2",
          Parameters: {
            StateMachineArn: archivedArn,
            Input: {
              flowType: "archived_lots",
              mode: "incremental",
              page: 1,
              perPage: config.perPage,
              minutes: config.incrementalMinutes,
            },
          },
          Retry: [{ ErrorEquals: ["States.ALL"], IntervalSeconds: 5, MaxAttempts: 2, BackoffRate: 2.0 }],
          End: true,
        },
      },
    }),
  );

  const combinedHourlySync = new aws.sfn.StateMachine("combined-hourly-sync", {
    name: `${namePrefix}-combined-hourly-sync`,
    roleArn: sfnRoleArn,
    type: "STANDARD",
    definition: combinedDefinition,
    ...mkLogging(combinedLog),
    tags,
  });

  return { fullInventoryBackfill, hourlyCarsSync, archivedLotsSync, combinedHourlySync };
}
