import { eq } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import { checkVinRecords, type VinRecordCheck } from "@/lib/vin-reports";

/**
 * Durable read-through cache in front of the FREE AuctionsAPI `check-records`
 * lookup (`lib/vin-reports.checkVinRecords`). One row per VIN in `vin_report_checks`
 * (migration 0032).
 *
 * Why a DB table and not `"use cache"`: the lookup runs at REQUEST time (a user
 * clicks a button / submits the /proverka-vin form), so it's never baked into a
 * prerender, and on serverless the in-memory `"use cache"` LRU doesn't persist across
 * instances/requests (see `cache-tags.ts`). Only a durable, cross-user store actually
 * dedupes repeat checks of the same VIN — which is what keeps us under the shared
 * AuctionsAPI ~3 req/s budget (the same key the ingestion pipeline spends). The
 * endpoint is free (no report credit), so the win is rate-limit + latency, not cost.
 *
 * TTL: the `carfax`/`autocheck` values are record COUNTS that only drift upward as
 * history accrues (the `vehicle` name is effectively immutable), so a long refresh
 * window is correct — a month-old count is still a faithful "history exists" signal.
 */
const TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

const checks = schema.vinReportChecks;

/**
 * Return the record-availability for `vin`, served from `vin_report_checks` when a
 * row exists and is younger than the TTL, otherwise fetched fresh from AuctionsAPI
 * and upserted. `vin` MUST already be validated + normalized (trimmed, upper-cased)
 * by the caller (the route/action validates via `vinCheckSchema`).
 *
 * Resilience: if the upstream call fails but a stale row exists, the stale row is
 * returned (a slightly old count beats an error). The upstream error only propagates
 * when there's nothing cached to fall back to — the route maps that to its 502.
 */
export async function getCachedVinRecords(vin: string): Promise<VinRecordCheck> {
  const db = getDb();

  const existing = (
    await db.select().from(checks).where(eq(checks.vin, vin)).limit(1)
  )[0];

  if (existing && Date.now() - existing.checkedAt.getTime() < TTL_MS) {
    return {
      vin: existing.vin,
      vehicle: existing.vehicle,
      carfax: existing.carfax,
      autocheck: existing.autocheck,
    };
  }

  let fresh: VinRecordCheck;
  try {
    fresh = await checkVinRecords(vin);
  } catch (error) {
    // Serve a stale row rather than failing when the upstream is down/rate-limited.
    if (existing) {
      return {
        vin: existing.vin,
        vehicle: existing.vehicle,
        carfax: existing.carfax,
        autocheck: existing.autocheck,
      };
    }
    throw error;
  }

  // Upsert keyed by the NORMALIZED `vin` param (what every lookup queries by), not
  // `fresh.vin` (the upstream-echoed value, which could differ in case/format and
  // orphan the row). A concurrent first-check race just writes the same value twice.
  await db
    .insert(checks)
    .values({
      vin,
      vehicle: fresh.vehicle,
      carfax: fresh.carfax,
      autocheck: fresh.autocheck,
    })
    .onConflictDoUpdate({
      target: checks.vin,
      set: {
        vehicle: fresh.vehicle,
        carfax: fresh.carfax,
        autocheck: fresh.autocheck,
        checkedAt: new Date(),
      },
    });

  return { ...fresh, vin };
}
