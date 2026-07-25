"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { isDepositStatus } from "@/constants/contracts";
import { getAdminSession } from "@/lib/admin";
import { getDb, schema } from "@/lib/db";
import type { ActionResult } from "@/types/action-result.type";

/**
 * Admin-only: move a deposit through its lifecycle (spec §14 — Чернова →
 * Подписан → Депозит платен → Върнат/Анулиран). Two guards:
 *
 *  - 'used' can NEVER be set manually — only contract creation sets it (§14.3),
 *    and a 'used' deposit can't be changed at all (the link to the mediation
 *    contract must stay intact; the single-use unique index depends on it).
 *
 * The transition lands in the audit trail.
 */
export async function updateDepositStatus(depositId: number, status: string): Promise<ActionResult> {
  const session = await getAdminSession();
  if (!session) return { success: false, error: "Нямате достъп до тази операция." };

  if (!Number.isInteger(depositId) || depositId <= 0) {
    return { success: false, error: "Невалиден идентификатор." };
  }
  if (!isDepositStatus(status) || status === "used") {
    return { success: false, error: "Невалиден статус." };
  }

  const db = getDb();
  const d = schema.depositContracts;
  const actorId = session.user?.id ?? null;

  try {
    const [deposit] = await db.select().from(d).where(eq(d.id, depositId));
    if (!deposit) return { success: false, error: "Депозитът не е намерен." };
    if (deposit.status === "used") {
      return { success: false, error: "Използван депозит не може да се променя." };
    }
    if (deposit.status === status) return { success: true, data: undefined };

    await db.transaction(async (tx) => {
      await tx
        .update(d)
        .set({ status, updatedBy: actorId, updatedAt: new Date() })
        .where(eq(d.id, depositId));
      await tx.insert(schema.contractEvents).values({
        entity: "deposit",
        entityId: depositId,
        action: "status_changed",
        actorId,
        data: { number: deposit.number, old: deposit.status, new: status },
      });
    });

    revalidatePath("/admin", "layout");
    return { success: true, data: undefined };
  } catch (error) {
    console.error("[update-deposit-status] failed", error);
    return { success: false, error: "Възникна грешка при запазването. Моля опитайте отново." };
  }
}
