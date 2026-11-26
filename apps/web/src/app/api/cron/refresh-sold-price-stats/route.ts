import { sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

/**
 * Daily rebuild of `sold_price_stats` (migration 0054) — invoked by Vercel Cron (see `crons` in apps/web/vercel.json).
 * The table holds the average realized sale price per make × model × year that the car page's benchmark and the model
 * hub's „продадени по години" table read; `refresh_sold_price_stats()` recomputes it from `car_listings_archived` in one
 * sequential pass (~1 s, measured 0.88 s on 26.11.2026) and writes only the rows whose numbers changed.
 *
 * Daily, not hourly: the readers are `cacheLife("days")` anyway, and every run reads the whole 1.65 GB archive — run
 * hourly, it would keep that table in Neon's working set, which is exactly what the precompute removed.
 *
 * No cache expiry here: the readers are tagged `cars`, the site-wide tag that also covers every cached car page, so
 * expiring it would throw away far more than these averages. They refresh within their `cacheLife("days")`.
 *
 * Auth: same contract as the other crons — Vercel sends `CRON_SECRET` as a Bearer header; fail closed with 401 when
 * unset. Idempotent: an unchanged archive writes nothing.
 */
export const maxDuration = 60;

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const started = Date.now();
  const result = await getDb().execute(sql`SELECT written, deleted FROM refresh_sold_price_stats()`);
  const row = result.rows[0] as { written: string | number; deleted: string | number } | undefined;
  const counts = { written: Number(row?.written ?? 0), deleted: Number(row?.deleted ?? 0), ms: Date.now() - started };

  console.log("[refresh-sold-price-stats]", counts);
  return NextResponse.json(counts);
}
