"use server";

import { eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { forgetCachedRoles } from "@/auth";
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
 * Three guards:
 *  - only known roles from APP_ROLES may be assigned (no arbitrary strings);
 *  - an admin cannot change THEIR OWN roles, which rules out locking yourself
 *    out of the back office through this screen;
 *  - the last admin keeps the role. With the guard above, that can only happen
 *    when two admins take it from each other at the same moment — so the admin
 *    rows are locked first, and the second change sees the first and is refused.
 *
 * NB: roles ride on the Auth.js JWT. A token that carries roles re-reads them at
 * most a minute later (auth.ts `currentRoles`), so removing or changing a role
 * of someone already working takes effect within a minute; a first role for an
 * account that had none applies at its next sign-in (the UI says so).
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
      if (!unique.includes("admin")) {
        const admins = await tx
          .select({ id: schema.users.id })
          .from(schema.users)
          .where(sql`'admin' = ANY(${schema.users.roles})`)
          .for("update");
        if (admins.some((a) => a.id === userId) && !admins.some((a) => a.id !== userId)) {
          throw new LastAdminError();
        }
      }
      await tx.update(schema.users).set({ roles: unique }).where(eq(schema.users.id, userId));
      await tx.insert(schema.contractEvents).values({
        entity: "user",
        entityId: 0, // users have TEXT ids; the detail lives in `data`.
        action: "roles_changed",
        actorId: session.user?.id ?? null,
        data: { userId, email: existing.email, old: existing.roles, new: unique },
      });
    });

    forgetCachedRoles(userId);
    revalidatePath("/admin", "layout");
    return { success: true, data: undefined };
  } catch (error) {
    if (error instanceof LastAdminError) {
      return { success: false, error: "Това е последният администратор — ролята му не може да се отнеме." };
    }
    console.error("[set-user-roles] failed", error);
    return { success: false, error: "Възникна грешка при запазването. Моля опитайте отново." };
  }
}

/** Thrown inside the transaction to roll it back when the change would leave no admin. */
class LastAdminError extends Error {}
