"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getAdminSession } from "@/lib/admin";
import { getDb, schema } from "@/lib/db";
import { MobilebgError, deleteAdvert, isConfigured, logout } from "@/lib/mobilebg/client";
import type { ActionResult } from "@/types/action-result.type";

/**
 * Remove one advert from mobile.bg.
 *
 * The local row is kept and marked `deleted` rather than dropped: it is the
 * record that we once paid for this advert, and it preserves the `ida` so a
 * later re-publish can be recognised as a NEW (billable) advert rather than
 * mistaken for an edit of a listing that no longer exists.
 *
 * The `ida` itself is cleared, though — mobile.bg has released it, and leaving
 * it in place would make the next publish send a stale id to `advertpub`, which
 * either fails or, worse, edits something else.
 */
export async function deleteMobilebgAdvert(carId: number): Promise<ActionResult<{ carId: number }>> {
  const session = await getAdminSession();
  if (!session) return { success: false, error: "Нямате достъп до тази операция." };

  if (!Number.isInteger(carId) || carId <= 0) {
    return { success: false, error: "Невалиден автомобил." };
  }
  if (!isConfigured()) {
    return { success: false, error: "Импортът към mobile.bg не е конфигуриран." };
  }

  const db = getDb();
  const rows = await db
    .select({ ida: schema.mobilebgAdverts.ida })
    .from(schema.mobilebgAdverts)
    .where(eq(schema.mobilebgAdverts.carId, carId))
    .limit(1);

  const ida = rows[0]?.ida;
  if (!ida) return { success: false, error: "Няма публикувана обява за този автомобил." };

  try {
    await deleteAdvert(ida);
  } catch (error) {
    const message =
      error instanceof MobilebgError ? `${error.status}: ${error.message}` : String(error);
    console.error("[mobilebg] delete failed", carId, ida, message);
    await db
      .update(schema.mobilebgAdverts)
      .set({ lastError: message, updatedAt: new Date() })
      .where(eq(schema.mobilebgAdverts.carId, carId));
    await logout();
    return { success: false, error: `Изтриването се провали — ${message}` };
  }

  await db
    .update(schema.mobilebgAdverts)
    .set({ status: "deleted", ida: null, payloadHash: null, lastError: null, updatedAt: new Date() })
    .where(eq(schema.mobilebgAdverts.carId, carId));

  await db.insert(schema.contractEvents).values({
    entity: "mobilebg_advert",
    entityId: carId,
    action: "deleted",
    actorId: session.user?.id ?? null,
    data: { ida },
  });

  await logout();
  revalidatePath("/admin/mobile-bg");
  return { success: true, data: { carId } };
}
