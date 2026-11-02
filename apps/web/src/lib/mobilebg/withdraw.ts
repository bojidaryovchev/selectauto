import "server-only";

import { getDb, schema } from "@/lib/db";
import { MobilebgError, deleteAdvert, isAdvertGone, isConfigured, logout } from "@/lib/mobilebg/client";
import { and, eq, inArray, isNotNull, ne } from "drizzle-orm";

/**
 * Taking an advert off mobile.bg — the shared core of „Изтрий" (an admin) and of
 * withdrawing the adverts of a car we were paid to hide (the de-index desk and
 * its sweep). A hidden car's advert kept selling it on mobile.bg, and was billed
 * every week it stayed up.
 *
 * Deleting is free and immediate, and it is what STOPS the charge: dealer
 * adverts never expire on their own and accrue a weekly fee for as long as they
 * are active (Общи условия I.14–I.16). Paid VIP/TOP time is not refunded (II.8).
 *
 * The local row is kept and marked `deleted` rather than dropped, as the record
 * that this car was advertised. Its `ida` is cleared — mobile.bg has released
 * it, and leaving it in place would make the next publish send a stale id to
 * `advertpub`, which either fails or, worse, edits something else.
 *
 * An advert already deleted on mobile.bg's side (by hand in their dealer panel)
 * answers „Wrong ida". That is the outcome „Изтрий" wanted, so it is recorded
 * as deleted too — it used to be stored as an error, and the row stayed „live"
 * in the register and in the count of billed adverts.
 */

export type WithdrawOutcome = { ok: true; alreadyGone: boolean } | { ok: false; error: string };

/**
 * Record that an advert is no longer on mobile.bg, with its audit row. Matches
 * on the id we acted on, so a publish that has since replaced it is left alone;
 * returns whether the row was changed.
 */
export async function markAdvertDeleted(
  carId: number,
  ida: string,
  opts: { actorId: string | null; reason?: string; alreadyGone?: boolean },
): Promise<boolean> {
  const db = getDb();
  const a = schema.mobilebgAdverts;
  const updated = await db
    .update(a)
    .set({ status: "deleted", ida: null, payloadHash: null, lastError: null, updatedAt: new Date() })
    .where(and(eq(a.carId, carId), eq(a.ida, ida)))
    .returning({ carId: a.carId });
  if (updated.length === 0) return false;
  await db.insert(schema.contractEvents).values({
    entity: "mobilebg_advert",
    entityId: carId,
    action: "deleted",
    actorId: opts.actorId,
    data: {
      ida,
      ...(opts.reason ? { reason: opts.reason } : {}),
      ...(opts.alreadyGone ? { goneAtMobilebg: true } : {}),
    },
  });
  return true;
}

/** Delete one advert and record it. Leaves the mobile.bg token to the caller's `logout()`. */
export async function withdrawAdvert(
  carId: number,
  ida: string,
  opts: { actorId: string | null; reason?: string },
): Promise<WithdrawOutcome> {
  let alreadyGone = false;
  try {
    await deleteAdvert(ida);
  } catch (error) {
    if (isAdvertGone(error)) {
      alreadyGone = true;
    } else {
      const message = error instanceof MobilebgError ? `${error.status}: ${error.message}` : String(error);
      console.error("[mobilebg] delete failed", { carId, ida, reason: opts.reason ?? null, message });
      await getDb()
        .update(schema.mobilebgAdverts)
        .set({ lastError: message, updatedAt: new Date() })
        .where(eq(schema.mobilebgAdverts.carId, carId));
      return { ok: false, error: message };
    }
  }

  await markAdvertDeleted(carId, ida, {
    actorId: opts.actorId,
    reason: alreadyGone ? "Обявата вече е била изтрита в mobile.bg." : opts.reason,
    alreadyGone,
  });
  console.log(alreadyGone ? "[mobilebg] advert was already gone" : "[mobilebg] advert deleted", {
    carId,
    ida,
    reason: opts.reason ?? null,
  });
  return { ok: true, alreadyGone };
}

export type WithdrawSummary = {
  /** Adverts these cars had live at mobile.bg. */
  found: number;
  withdrawn: number;
  /** Still live — the deletion failed, or the import account isn't configured here. */
  failed: number;
};

/** Withdraw every live advert of these cars — they were just hidden from the site. */
export async function withdrawAdvertsOfCars(carIds: number[], actorId: string | null): Promise<WithdrawSummary> {
  if (carIds.length === 0) return { found: 0, withdrawn: 0, failed: 0 };
  const a = schema.mobilebgAdverts;
  const live = await getDb()
    .select({ carId: a.carId, ida: a.ida })
    .from(a)
    .where(and(inArray(a.carId, carIds), isNotNull(a.ida), ne(a.status, "deleted")));
  if (live.length === 0) return { found: 0, withdrawn: 0, failed: 0 };
  if (!isConfigured()) {
    console.error("[mobilebg] hidden cars still have adverts, import not configured", {
      carIds: live.map((r) => r.carId),
    });
    return { found: live.length, withdrawn: 0, failed: live.length };
  }

  let withdrawn = 0;
  for (const row of live) {
    const outcome = await withdrawAdvert(row.carId, row.ida!, {
      actorId,
      reason: "Колата е скрита (платено скриване).",
    });
    if (outcome.ok) withdrawn += 1;
  }
  await logout();
  return { found: live.length, withdrawn, failed: live.length - withdrawn };
}
