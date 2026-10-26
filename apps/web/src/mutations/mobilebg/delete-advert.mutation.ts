"use server";

import { getSessionWith } from "@/lib/admin";
import { getDb, schema } from "@/lib/db";
import { isConfigured, logout } from "@/lib/mobilebg/client";
import { withdrawAdvert } from "@/lib/mobilebg/withdraw";
import type { ActionResult } from "@/types/action-result.type";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

/**
 * Remove one advert from mobile.bg — „Изтрий" in the register. The deletion
 * itself (and why the row is kept, marked `deleted`) is `withdrawAdvert`, shared
 * with the de-index desk, which withdraws the adverts of the cars it hides.
 */
export async function deleteMobilebgAdvert(carId: number): Promise<ActionResult<{ carId: number }>> {
  const session = await getSessionWith("mobilebg.publish");
  if (!session) return { success: false, error: "Нямате достъп до тази операция." };

  if (!Number.isInteger(carId) || carId <= 0) {
    return { success: false, error: "Невалиден автомобил." };
  }
  if (!isConfigured()) {
    return { success: false, error: "Импортът към mobile.bg не е конфигуриран." };
  }

  const rows = await getDb()
    .select({ ida: schema.mobilebgAdverts.ida })
    .from(schema.mobilebgAdverts)
    .where(eq(schema.mobilebgAdverts.carId, carId))
    .limit(1);

  const ida = rows[0]?.ida;
  if (!ida) return { success: false, error: "Няма публикувана обява за този автомобил." };

  const outcome = await withdrawAdvert(carId, ida, { actorId: session.user?.id ?? null });
  await logout();
  if (!outcome.ok) return { success: false, error: `Изтриването се провали — ${outcome.error}` };

  revalidatePath("/admin/mobile-bg");
  return { success: true, data: { carId } };
}
