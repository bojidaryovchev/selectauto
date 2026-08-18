"use server";

import { and, eq, isNull, sql } from "drizzle-orm";
import { revalidatePath, updateTag } from "next/cache";
import { getAdminSession } from "@/lib/admin";
import { CACHE_TAGS, carCacheTag } from "@/lib/cache-tags";
import { getDb, schema } from "@/lib/db";
import { isUsableVin, normalizeVin } from "@/lib/vin";
import { submitIndexNow } from "@/lib/indexnow";
import { SITE_URL } from "@/constants";
import type { ActionResult } from "@/types/action-result.type";

/**
 * Paid de-index: hide every URL belonging to one physical vehicle.
 *
 * Admin-only, never observer — this is a money-taking, externally-visible action.
 * The guard is the first statement because a server action is a POST reachable by
 * anyone who can forge the request.
 *
 * ── The four things this must do, in this order ─────────────────────────────
 *  1. Record the request (`car_deindex_requests`) — it is a sold service, so the
 *     paper trail is part of the product, not bookkeeping.
 *  2. Stamp `cars.deindexed_at` on EVERY car row sharing the normalized VIN.
 *     One vehicle owns several rows (relist, Copart→IAAI), each with its own
 *     `/avtomobil/{id}`; missing the siblings is the failure the customer finds
 *     by googling their VIN.
 *  3. Recompute the projections THROUGH `recompute_*_counted`, in the same
 *     transaction. This is what removes the car from the catalog, the counts,
 *     the facet dropdowns, the hubs, both sitemaps, /lyubimi, the digest email
 *     and the search box. A direct `DELETE FROM car_listings` would do the first
 *     part and permanently corrupt the summary tables, which are maintained by a
 *     before/after diff inside those wrappers.
 *  4. Expire the caches, per car and site-wide.
 *
 * Step 3 CANNOT be left to ingestion: it only recomputes cars whose upstream
 * payload actually changed, so an untouched car would stay listed until the
 * WEEKLY drift sweep.
 */

export type ApplyDeindexInput = {
  vin: string;
  requesterName?: string;
  requesterContact?: string;
  proofNote?: string;
  feeAmount?: string;
  notes?: string;
};

export type ApplyDeindexResult = {
  vin: string;
  carIds: number[];
  indexNow: "submitted" | "skipped" | "failed";
};

export async function applyDeindex(
  input: ApplyDeindexInput,
): Promise<ActionResult<ApplyDeindexResult>> {
  const session = await getAdminSession();
  if (!session) {
    return { success: false, error: "Нямате достъп до тази операция." };
  }

  const vin = normalizeVin(input?.vin);
  if (!isUsableVin(vin)) {
    return { success: false, error: "Невалиден VIN." };
  }

  const fee = input.feeAmount?.trim();
  if (fee && !/^\d+(\.\d{1,2})?$/.test(fee)) {
    return { success: false, error: "Невалидна сума." };
  }

  const db = getDb();
  let carIds: number[] = [];

  try {
    carIds = await db.transaction(async (tx) => {
      // Every car row for this vehicle. Matches the functional index from 0044 —
      // keep the expression identical or the index stops being used.
      const matches = await tx
        .select({ id: schema.cars.id })
        .from(schema.cars)
        .where(sql`upper(btrim(${schema.cars.vin})) = ${vin}`);

      const ids = matches.map((m) => m.id);
      if (ids.length === 0) return [];

      // One ACTIVE request per VIN (partial unique index). A repeat request for
      // an already-de-indexed VIN updates the existing row rather than failing.
      await tx
        .insert(schema.carDeindexRequests)
        .values({
          vinNormalized: vin,
          requesterName: input.requesterName?.trim() || null,
          requesterContact: input.requesterContact?.trim() || null,
          proofNote: input.proofNote?.trim() || null,
          feeAmount: fee || null,
          paidAt: fee ? new Date() : null,
          notes: input.notes?.trim() || null,
          createdBy: session.user?.id ?? null,
        })
        .onConflictDoNothing();

      await tx
        .update(schema.cars)
        .set({ deindexedAt: new Date() })
        .where(and(sql`upper(btrim(${schema.cars.vin})) = ${vin}`, isNull(schema.cars.deindexedAt)));

      // Audit row. `entityId: 0` because the key here is a VIN, not an integer —
      // the repo's existing convention for that case (see set-user-roles). The
      // real key travels in `data`, and /admin/dnevnik renders it.
      await tx.insert(schema.contractEvents).values({
        entity: "car_deindex",
        entityId: 0,
        action: "deindexed",
        actorId: session.user?.id ?? null,
        data: { vin, carIds: ids, fee: fee || null, requester: input.requesterName?.trim() || null },
      });

      // Same transaction: the projections and their summary deltas move together.
      await tx.execute(sql`SELECT recompute_car_listings_counted(${sql.raw(`ARRAY[${ids.join(",")}]::integer[]`)})`);
      await tx.execute(
        sql`SELECT recompute_archived_car_listings_counted(${sql.raw(`ARRAY[${ids.join(",")}]::integer[]`)})`,
      );

      return ids;
    });
  } catch (error) {
    console.error("[deindex] apply failed", vin, error);
    return { success: false, error: "Възникна грешка при обработката. Моля опитайте отново." };
  }

  if (carIds.length === 0) {
    return { success: false, error: "Няма автомобил с този VIN." };
  }

  // `updateTag`, NOT `revalidateTag(tag, "max")`: "max" is stale-while-revalidate,
  // so the next visitor would still be served the car we were paid to hide.
  for (const id of carIds) updateTag(carCacheTag(id));
  updateTag(CACHE_TAGS.cars);
  updateTag(CACHE_TAGS.buyNowCars);
  updateTag(CACHE_TAGS.auctionCars);

  // Tell the engines that DO accept deletion notifications. Google is not among
  // them (it has no removal API at all) — the Search Console step stays manual.
  const indexNow = await submitIndexNow(carIds.map((id) => `${SITE_URL}/avtomobil/${id}`));

  revalidatePath("/admin", "layout");
  return { success: true, data: { vin, carIds, indexNow } };
}

/**
 * Undo a de-index: clear the flag, put the car back in the projections, and mark
 * the request revoked (soft — the history of a paid service is kept).
 *
 * NOTE the asymmetry, which the UI must state plainly: this restores OUR site
 * immediately, but it does not lift a Bing block (that needs an explicit
 * RemoveBlockedUrl call) and Google re-crawls on its own schedule.
 */
export async function revokeDeindex(vinInput: string): Promise<ActionResult<{ carIds: number[] }>> {
  const session = await getAdminSession();
  if (!session) {
    return { success: false, error: "Нямате достъп до тази операция." };
  }

  const vin = normalizeVin(vinInput);
  if (!isUsableVin(vin)) {
    return { success: false, error: "Невалиден VIN." };
  }

  const db = getDb();
  let carIds: number[] = [];

  try {
    carIds = await db.transaction(async (tx) => {
      const matches = await tx
        .select({ id: schema.cars.id })
        .from(schema.cars)
        .where(sql`upper(btrim(${schema.cars.vin})) = ${vin}`);
      const ids = matches.map((m) => m.id);
      if (ids.length === 0) return [];

      await tx
        .update(schema.cars)
        .set({ deindexedAt: null })
        .where(sql`upper(btrim(${schema.cars.vin})) = ${vin}`);

      await tx
        .update(schema.carDeindexRequests)
        .set({ revokedAt: new Date(), revokedBy: session.user?.id ?? null })
        .where(
          and(
            eq(schema.carDeindexRequests.vinNormalized, vin),
            isNull(schema.carDeindexRequests.revokedAt),
          ),
        );

      await tx.insert(schema.contractEvents).values({
        entity: "car_deindex",
        entityId: 0,
        action: "deindex_revoked",
        actorId: session.user?.id ?? null,
        data: { vin, carIds: ids },
      });

      await tx.execute(sql`SELECT recompute_car_listings_counted(${sql.raw(`ARRAY[${ids.join(",")}]::integer[]`)})`);
      await tx.execute(
        sql`SELECT recompute_archived_car_listings_counted(${sql.raw(`ARRAY[${ids.join(",")}]::integer[]`)})`,
      );

      return ids;
    });
  } catch (error) {
    console.error("[deindex] revoke failed", vin, error);
    return { success: false, error: "Възникна грешка при обработката. Моля опитайте отново." };
  }

  if (carIds.length === 0) {
    return { success: false, error: "Няма автомобил с този VIN." };
  }

  for (const id of carIds) updateTag(carCacheTag(id));
  updateTag(CACHE_TAGS.cars);
  updateTag(CACHE_TAGS.buyNowCars);
  updateTag(CACHE_TAGS.auctionCars);

  revalidatePath("/admin", "layout");
  return { success: true, data: { carIds } };
}
