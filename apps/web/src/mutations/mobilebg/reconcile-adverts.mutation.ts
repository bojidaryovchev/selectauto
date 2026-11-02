"use server";

import { getSessionWith } from "@/lib/admin";
import { getDb, schema } from "@/lib/db";
import { MobilebgError, isConfigured, listAccountAdvertIds, logout } from "@/lib/mobilebg/client";
import type { ActionResult } from "@/types/action-result.type";
import { and, inArray, isNotNull, lt, ne } from "drizzle-orm";
import { revalidatePath } from "next/cache";

/**
 * „Сверка с mobile.bg" — the register against the account's own list of adverts.
 *
 * An advert deleted in mobile.bg's dealer panel never reaches us, so its row
 * stayed „публикувана": counted among the billed adverts of cars no longer
 * offered, its „Изтрий" failing with „Wrong ida", and the publisher offering a
 * free correction of an advert that no longer exists. On 02.11.2026 that was
 * 106 of the 154 rows the register held as live (each one's public page a 404).
 *
 * `apply: false` only reports; `apply: true` marks every register row whose id
 * is missing from the list as deleted. Nothing is sent to mobile.bg either way —
 * reading the list is free. Rows touched in the last 10 minutes are left out: a
 * publish that finished after the list was read would otherwise look missing.
 */

const RECENT_MS = 10 * 60 * 1000;

/** How many untracked advert ids are listed by name. */
const UNTRACKED_SHOWN = 20;

export type ReconcileResult = {
  /** Adverts on the mobile.bg account right now. */
  remoteCount: number;
  /** Rows the register holds as live (an id, not deleted) that were compared. */
  checked: number;
  /** Of those, the ones mobile.bg no longer has. */
  missing: { carId: number; ida: string }[];
  /** Adverts on the account this register never published — made by hand in mobile.bg, say. */
  untrackedCount: number;
  untracked: string[];
  /** Rows marked deleted by this call (0 unless `apply`). */
  marked: number;
};

export async function reconcileMobilebgAdverts(apply: boolean): Promise<ActionResult<ReconcileResult>> {
  const session = await getSessionWith("mobilebg.publish");
  if (!session) return { success: false, error: "Нямате достъп до тази операция." };
  if (!isConfigured()) {
    return { success: false, error: "Импортът към mobile.bg не е конфигуриран." };
  }

  let remote: Set<string>;
  try {
    remote = await listAccountAdvertIds();
  } catch (error) {
    const message = error instanceof MobilebgError ? `${error.status}: ${error.message}` : String(error);
    console.error("[mobilebg] reconcile: listing failed", { message });
    return { success: false, error: `Списъкът на обявите от mobile.bg не можа да се прочете — нищо не е променено. ${message}` };
  } finally {
    await logout();
  }

  const db = getDb();
  const a = schema.mobilebgAdverts;
  const cutoff = new Date(Date.now() - RECENT_MS);
  const [live, tracked] = await Promise.all([
    db
      .select({ carId: a.carId, ida: a.ida })
      .from(a)
      .where(and(isNotNull(a.ida), ne(a.status, "deleted"), lt(a.updatedAt, cutoff))),
    db.select({ ida: a.ida }).from(a).where(isNotNull(a.ida)),
  ]);

  // An empty list against live rows is more likely a bad reply than every
  // advert gone at once; one by one, „Изтрий" still records the gone ones.
  if (remote.size === 0 && live.length > 0) {
    return {
      success: false,
      error: `mobile.bg върна празен списък, а в регистъра има ${live.length} активни обяви — сверката е спряна, нищо не е променено.`,
    };
  }

  const missing = live.filter((r) => !remote.has(r.ida!)).map((r) => ({ carId: r.carId, ida: r.ida! }));
  const trackedIds = new Set(tracked.map((r) => r.ida!));
  const untracked = [...remote].filter((ida) => !trackedIds.has(ida));

  let marked = 0;
  if (apply && missing.length > 0) {
    const actorId = session.user?.id ?? null;
    const idaOf = new Map(missing.map((m) => [m.carId, m.ida]));
    marked = await db.transaction(async (tx) => {
      const rows = await tx
        .update(a)
        .set({ status: "deleted", ida: null, payloadHash: null, lastError: null, updatedAt: new Date() })
        .where(
          and(
            inArray(
              a.ida,
              missing.map((m) => m.ida),
            ),
            ne(a.status, "deleted"),
            lt(a.updatedAt, cutoff),
          ),
        )
        .returning({ carId: a.carId });
      if (rows.length === 0) return 0;
      await tx.insert(schema.contractEvents).values(
        rows.map((r) => ({
          entity: "mobilebg_advert",
          entityId: r.carId,
          action: "deleted",
          actorId,
          data: { ida: idaOf.get(r.carId), reason: "Няма я в mobile.bg (сверка).", goneAtMobilebg: true },
        })),
      );
      return rows.length;
    });
    revalidatePath("/admin/mobile-bg");
  }

  console.log("[mobilebg] reconcile", {
    apply,
    remote: remote.size,
    checked: live.length,
    missing: missing.length,
    untracked: untracked.length,
    marked,
  });

  return {
    success: true,
    data: {
      remoteCount: remote.size,
      checked: live.length,
      missing,
      untrackedCount: untracked.length,
      untracked: untracked.slice(0, UNTRACKED_SHOWN),
      marked,
    },
  };
}
