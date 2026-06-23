/**
 * EventBridge Scheduler schedules for the recurring flows.
 *
 * We use EventBridge *Scheduler* (aws.scheduler.Schedule) rather than classic
 * EventBridge Rules: it targets Step Functions / Lambda directly, supports
 * flexible time windows, and is the current recommended service for scheduled
 * invocations.
 *
 * Schedules:
 *   1. hourly combined sync  -> StartExecution on combinedHourlySync
 *      (active cars then archived lots, sequentially — protects the rate limit)
 *   2. daily reference sync   -> invoke syncReferenceData Lambda (optional)
 *
 * The full inventory backfill has NO schedule — it is started manually.
 */
import * as aws from "@pulumi/aws";
import * as pulumi from "@pulumi/pulumi";
import { config, namePrefix, tags } from "./config";

export interface Schedules {
  hourlyCombinedSync: aws.scheduler.Schedule;
  dailyReferenceSync: aws.scheduler.Schedule;
}

export function createSchedules(args: {
  schedulerRoleArn: pulumi.Input<string>;
  combinedHourlySyncArn: pulumi.Input<string>;
  /** The timeout-proof reference-sync STATE MACHINE arn (not the legacy Lambda). */
  referenceSyncArn: pulumi.Input<string>;
}): Schedules {
  // --- 1. Hourly combined sync ---
  const hourlyCombinedSync = new aws.scheduler.Schedule("hourly-combined-sync", {
    name: `${namePrefix}-hourly-combined-sync`,
    scheduleExpression: config.hourlySyncScheduleExpression, // e.g. rate(1 hour)
    flexibleTimeWindow: { mode: "OFF" },
    target: {
      arn: args.combinedHourlySyncArn,
      roleArn: args.schedulerRoleArn,
      // No Input needed: the combined machine supplies its own child inputs.
      input: JSON.stringify({ triggeredBy: "eventbridge-hourly" }),
    },
  });

  // --- 2. Daily reference sync (timeout-proof state machine) ---
  // Starts the reference-sync loop. ReferenceInit re-upserts manufacturers each
  // run (cheap, idempotent) and the loop refreshes models/generations. Skips
  // empty manufacturers by default (includeEmpty defaults false).
  const dailyReferenceSync = new aws.scheduler.Schedule("daily-reference-sync", {
    name: `${namePrefix}-daily-reference-sync`,
    scheduleExpression: config.dailyReferenceSyncScheduleExpression, // e.g. rate(1 day)
    flexibleTimeWindow: { mode: "OFF" },
    target: {
      arn: args.referenceSyncArn,
      roleArn: args.schedulerRoleArn,
      input: JSON.stringify({ includeEmpty: false }),
    },
  });

  return { hourlyCombinedSync, dailyReferenceSync };
}

// Tags note: aws.scheduler.Schedule does not accept tags; tagging is applied to
// the schedule group instead. We use the default group here for simplicity.
void tags;
