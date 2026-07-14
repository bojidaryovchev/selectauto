"use server";

import { and, eq } from "drizzle-orm";
import { auth } from "@/auth";
import { getDb, schema } from "@/lib/db";
import type { ActionResult } from "@/types/action-result.type";

/**
 * Toggles a car in the signed-in user's favourites and returns the NEW state
 * (`favorited: true` if it's now saved, `false` if it was removed).
 *
 * Auth is gated PER-ACTION (not in proxy.ts): the catalog is public, so a
 * signed-out caller — including a direct POST, since a Server Action is a public
 * endpoint — gets `{ success: false }` with no DB write. The heart button sends
 * signed-out users to /sign-in before this ever runs; this is the
 * defence-in-depth backstop.
 *
 * The toggle is a single idempotent statement: INSERT … ON CONFLICT DO NOTHING
 * with a RETURNING — if a row comes back it was newly inserted (now favourited);
 * if not, the pair already existed, so we DELETE it (now un-favourited). Keying
 * on the composite PK (user_id, car_id) means a double-click can't create
 * duplicates.
 */
export async function toggleFavorite(carId: unknown): Promise<ActionResult<{ favorited: boolean }>> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return { success: false, error: "Трябва да влезете в профила си, за да запазвате автомобили." };
  }

  // Validate the car id is a positive integer (the action is a public endpoint).
  const id = Number(carId);
  if (!Number.isInteger(id) || id <= 0) {
    return { success: false, error: "Невалиден автомобил." };
  }

  try {
    const db = getDb();

    // Try to insert; ON CONFLICT DO NOTHING returns 0 rows when it already exists.
    const inserted = await db
      .insert(schema.favorites)
      .values({ userId, carId: id })
      .onConflictDoNothing()
      .returning({ carId: schema.favorites.carId });

    if (inserted.length > 0) {
      return { success: true, data: { favorited: true } };
    }

    // Already favourited → remove it.
    await db
      .delete(schema.favorites)
      .where(and(eq(schema.favorites.userId, userId), eq(schema.favorites.carId, id)));

    return { success: true, data: { favorited: false } };
  } catch (error) {
    // A bad car_id (no matching cars row) trips the FK — surface a clean message
    // rather than throwing; the FK violation is caught generically here.
    console.error("[toggle-favorite] failed", error);
    return { success: false, error: "Възникна грешка. Моля опитайте отново." };
  }
}
