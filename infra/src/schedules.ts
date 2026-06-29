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
 *   2. daily reference sync   -> StartExecution on the reference-sync STATE MACHINE
 *      (the timeout-proof loop, not the legacy single syncReferenceData Lambda)
 *
 * The full inventory backfill has NO schedule — it is started manually.
 */
import * as aws from "@pulumi/aws";
import * as pulumi from "@pulumi/pulumi";
import { config, namePrefix, tags } from "./config";

export interface Schedules {
  hourlyCombinedSync: aws.scheduler.Schedule;
  dailyReferenceSync: aws.scheduler.Schedule;
  weeklyDriftSweep: aws.scheduler.Schedule;
}

export function createSchedules(args: {
  schedulerRoleArn: pulumi.Input<string>;
  combinedHourlySyncArn: pulumi.Input<string>;
  /** The timeout-proof reference-sync STATE MACHINE arn (not the legacy Lambda). */
  referenceSyncArn: pulumi.Input<string>;
  /** The drift-repair sweep STATE MACHINE arn (weekly projection self-heal). */
  driftSweepArn: pulumi.Input<string>;
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

  // --- 3. Weekly drift-repair sweep (projection self-heal) ---
  // Re-runs the projection recompute over EVERY car via the looped state machine,
  // repairing any best-effort recompute swallowed during ingestion (and keeping
  // car_listing_counts/_facets exact). Weekly is enough: the hourly sync already
  // recomputes touched cars; this only mops up the rare swallowed failure. ~14 min
  // of DB work, off-peak. Default Sunday 03:00 UTC.
  const weeklyDriftSweep = new aws.scheduler.Schedule("weekly-drift-sweep", {
    name: `${namePrefix}-weekly-drift-sweep`,
    scheduleExpression: config.weeklyDriftSweepScheduleExpression, // e.g. cron(0 3 ? * SUN *)
    flexibleTimeWindow: { mode: "OFF" },
    target: {
      arn: args.driftSweepArn,
      roleArn: args.schedulerRoleArn,
      // Init supplies its own defaults (batchSize 25000, cursor 0).
      input: JSON.stringify({ triggeredBy: "eventbridge-weekly" }),
    },
  });

  return { hourlyCombinedSync, dailyReferenceSync, weeklyDriftSweep };
}

// Tags note: aws.scheduler.Schedule does not accept tags; tagging is applied to
// the schedule group instead. We use the default group here for simplicity.
void tags;
