import { SITE_URL } from "@/constants";
import { CACHE_TAGS, carCacheTag } from "@/lib/cache-tags";
import { getDb, schema } from "@/lib/db";
import { submitIndexNow } from "@/lib/indexnow";
import { withdrawAdvertsOfCars } from "@/lib/mobilebg/withdraw";
import { and, eq, isNotNull, isNull, sql } from "drizzle-orm";
import { revalidateTag } from "next/cache";
import { NextResponse } from "next/server";

/**
 * Forward-applies paid de-indexes — invoked by Vercel Cron every 15 minutes
 * (see `crons` in apps/web/vercel.json).
 *
 * A request is keyed on the VIN, and ingestion keeps adding cars: a relisted
 * vehicle arrives as a NEW `cars` row with its own indexable `/avtomobil/{id}`,
 * which nothing hid — the failure a paying customer finds by googling their own
 * VIN. This stamps `deindexed_at` on every such row of an active request, then
 * does what the de-index desk does for its own cars: recompute the projections
 * through the `_counted` wrappers in the same transaction, expire the caches,
 * notify IndexNow, and withdraw any mobile.bg advert of the car.
 *
 * A post-sync step rather than a change to the ingestion Lambdas (the design's
 * other option, docs/admin-mail-and-deindex-plan.md §3.1): it ships with the
 * site and needs no AWS deploy, at the cost of up to 15 minutes before a new
 * row is hidden. The lookup is one `cars_vin_normalized_idx` probe per active
 * request (EXPLAIN-checked).
 *
 * Auth: same contract as the other crons — Vercel sends `CRON_SECRET` as a
 * Bearer header; fail closed with 401 when unset. Idempotent (only unstamped
 * rows match), so an overlapping run finds nothing. `?dryRun=1` reports what it
 * WOULD hide without writing.
 */
export const maxDuration = 60;

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const db = getDb();
  const c = schema.cars;
  const r = schema.carDeindexRequests;
  // The same expression as `cars_vin_normalized_idx` (migration 0044, partial on
  // `vin IS NOT NULL`) — keep it identical or the index stops being used.
  const unstamped = and(
    isNull(r.revokedAt),
    isNotNull(c.vin),
    eq(sql`upper(btrim(${c.vin}))`, r.vinNormalized),
    isNull(c.deindexedAt),
  );

  if (new URL(request.url).searchParams.get("dryRun") !== null) {
    const rows = await db.select({ id: c.id, vin: r.vinNormalized }).from(c).innerJoin(r, unstamped);
    return NextResponse.json({ dryRun: true, wouldHide: rows.length, details: rows });
  }

  const stamped = await db.transaction(async (tx) => {
    const rows = await tx
      .update(c)
      .set({ deindexedAt: new Date() })
      .from(r)
      .where(unstamped)
      .returning({ id: c.id, vin: r.vinNormalized });
    if (rows.length === 0) return rows;

    const byVin = new Map<string, number[]>();
    for (const row of rows) byVin.set(row.vin, [...(byVin.get(row.vin) ?? []), row.id]);
    // One audit row per request it extended; no actor — the sweep did it.
    for (const [vin, carIds] of byVin) {
      await tx.insert(schema.contractEvents).values({
        entity: "car_deindex",
        entityId: 0,
        action: "deindex_extended",
        actorId: null,
        data: { vin, carIds },
      });
    }

    const ids = sql.raw(`ARRAY[${rows.map((row) => row.id).join(",")}]::integer[]`);
    await tx.execute(sql`SELECT recompute_car_listings_counted(${ids})`);
    await tx.execute(sql`SELECT recompute_archived_car_listings_counted(${ids})`);
    return rows;
  });

  if (stamped.length === 0) return NextResponse.json({ hidden: 0 });

  const carIds = stamped.map((row) => row.id);
  // `updateTag` is Server-Action-only; outside one, `{ expire: 0 }` is the
  // immediate expiry (revalidateTag docs) — "max" would serve the hidden car again.
  for (const id of carIds) revalidateTag(carCacheTag(id), { expire: 0 });
  revalidateTag(CACHE_TAGS.cars, { expire: 0 });
  revalidateTag(CACHE_TAGS.buyNowCars, { expire: 0 });
  revalidateTag(CACHE_TAGS.auctionCars, { expire: 0 });

  const indexNow = await submitIndexNow(carIds.map((id) => `${SITE_URL}/avtomobil/${id}`));
  const adverts = await withdrawAdvertsOfCars(carIds, null);

  console.log("[deindex-sweep] hid newly ingested rows", { carIds, indexNow, adverts });
  return NextResponse.json({ hidden: carIds.length, carIds, indexNow, adverts });
}
