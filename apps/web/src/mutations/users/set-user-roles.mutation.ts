"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { APP_ROLES, type AppRole } from "@/constants/admin";
import { getAdminSession } from "@/lib/admin";
import { getDb, schema } from "@/lib/db";
import type { ActionResult } from "@/types/action-result.type";

export type SetUserRolesInput = {
  userId: string;
  /** The complete new role set — an empty array revokes back-office access. */
  roles: string[];
};

/**
 * Admin-only: grant/revoke elevated roles on an account — the screen behind
 * „профил на Радка и другите, които работят като наблюдаващи" (owner, 07.2026).
 *
 * Two guards:
 *  - only known roles from APP_ROLES may be assigned (no arbitrary strings);
 *  - an admin cannot change THEIR OWN roles, which makes locking yourself (or
 *    the last admin) out of the back office impossible through this screen.
 *
 * NB: roles ride on the Auth.js JWT, minted from the DB at SIGN-IN, so a change
 * takes effect the next time that person signs in (the UI says so).
 */
export async function setUserRoles(input: SetUserRolesInput): Promise<ActionResult> {
  const session = await getAdminSession();
  if (!session) return { success: false, error: "Нямате достъп до тази операция." };

  const userId = input?.userId;
  if (typeof userId !== "string" || !userId) {
    return { success: false, error: "Невалиден потребител." };
  }
  if (userId === session.user?.id) {
    return { success: false, error: "Не можете да променяте собствените си права." };
  }

  const roles = Array.isArray(input?.roles) ? input.roles : [];
  const invalid = roles.filter((r) => !(APP_ROLES as readonly string[]).includes(r));
  if (invalid.length > 0) {
    return { success: false, error: `Непозната роля: ${invalid.join(", ")}` };
  }
  const unique = [...new Set(roles)] as AppRole[];

  try {
    const db = getDb();
    const [existing] = await db
      .select({ id: schema.users.id, email: schema.users.email, roles: schema.users.roles })
      .from(schema.users)
      .where(eq(schema.users.id, userId));
    if (!existing) return { success: false, error: "Потребителят не е намерен." };

    await db.transaction(async (tx) => {
      await tx.update(schema.users).set({ roles: unique }).where(eq(schema.users.id, userId));
      await tx.insert(schema.contractEvents).values({
        entity: "user",
        entityId: 0, // users have TEXT ids; the detail lives in `data`.
        action: "roles_changed",
        actorId: session.user?.id ?? null,
        data: { userId, email: existing.email, old: existing.roles, new: unique },
      });
    });

    revalidatePath("/admin", "layout");
    return { success: true, data: undefined };
  } catch (error) {
    console.error("[set-user-roles] failed", error);
    return { success: false, error: "Възникна грешка при запазването. Моля опитайте отново." };
  }
}
