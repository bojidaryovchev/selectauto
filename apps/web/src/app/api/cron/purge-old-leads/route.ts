import { sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { type RetentionCounts, retentionCountSql, retentionDeleteSql } from "@/lib/lead-retention";

/**
 * Monthly retention sweep — invoked by Vercel Cron (see `crons` in apps/web/vercel.json). Deletes the inquiries,
 * Carfax requests and calculator offers of people whose last contact is more than 12 months ago and who never signed
 * a contract, with their e-mail threads, as the privacy policy promises (§5, owner decision 33). The rules are in
 * lib/lead-retention.ts. The first leads (June 2026) come due in June 2027; until then every run deletes nothing.
 *
 * Auth: same contract as the other crons — Vercel sends `CRON_SECRET` as a Bearer header; fail closed with 401 when
 * unset. Idempotent: a deleted row is gone, so a double fire deletes nothing more. `?dryRun=1` reports what WOULD be
 * deleted without writing.
 */
export const maxDuration = 60;

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const dryRun = new URL(request.url).searchParams.get("dryRun") !== null;
  const result = await getDb().execute(sql.raw(dryRun ? retentionCountSql() : retentionDeleteSql()));
  const counts = result.rows[0] as RetentionCounts;

  if (!dryRun && Object.values(counts).some((n) => n > 0)) {
    console.log(`[purge-old-leads] deleted ${JSON.stringify(counts)}`);
  }
  return NextResponse.json(dryRun ? { dryRun: true, wouldDelete: counts } : { deleted: counts });
}
