"use server";

import { and, count, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getAdminSession } from "@/lib/admin";
import { getDb, schema } from "@/lib/db";
import type { ActionResult } from "@/types/action-result.type";

/**
 * Admin-only: „Върни статус“ за плащане (spec §4.3 — a mistaken mark-as-paid
 * can be undone, but the action stays in the history). Clears the recorded
 * paid amount/date and returns the stage to 'awaiting_payment' when a notice
 * has been generated, else 'not_requested'. The cleared values are preserved in
 * the audit event. If the contract had auto-flipped to 'fully_paid', it goes
 * back to 'active'.
 */
export async function revertPayment(paymentId: number): Promise<ActionResult> {
  const session = await getAdminSession();
  if (!session) return { success: false, error: "Нямате достъп до тази операция." };

  if (!Number.isInteger(paymentId) || paymentId <= 0) {
    return { success: false, error: "Невалиден идентификатор." };
  }

  const db = getDb();
  const p = schema.contractPayments;
  const actorId = session.user?.id ?? null;

  try {
    const [payment] = await db.select().from(p).where(eq(p.id, paymentId));
    if (!payment) return { success: false, error: "Плащането не е намерено." };
    if (payment.status !== "paid" && payment.status !== "partially_paid" && payment.status !== "cancelled") {
      return { success: false, error: "Няма отбелязано плащане за връщане." };
    }

    const g = schema.generatedDocuments;
    const [{ value: docCount }] = await db
      .select({ value: count() })
      .from(g)
      .where(and(eq(g.paymentId, paymentId), eq(g.kind, "payment_notice")));
    const newStatus = docCount > 0 ? "awaiting_payment" : "not_requested";

    await db.transaction(async (tx) => {
      await tx
        .update(p)
        .set({ paidAmount: "0.00", paidAt: null, status: newStatus, updatedAt: new Date() })
        .where(eq(p.id, paymentId));

      await tx.insert(schema.contractEvents).values({
        entity: "payment",
        entityId: paymentId,
        action: "payment_reverted",
        actorId,
        data: {
          stage: payment.stage,
          clearedPaidAmount: payment.paidAmount,
          clearedPaidAt: payment.paidAt,
          oldStatus: payment.status,
          newStatus,
        },
      });

      // A fully-paid contract can't stay fully paid with a reverted stage.
      const [contract] = await tx
        .select({ id: schema.contracts.id, status: schema.contracts.status })
        .from(schema.contracts)
        .where(eq(schema.contracts.id, payment.contractId));
      if (contract?.status === "fully_paid") {
        await tx
          .update(schema.contracts)
          .set({ status: "active", updatedBy: actorId, updatedAt: new Date() })
          .where(eq(schema.contracts.id, contract.id));
        await tx.insert(schema.contractEvents).values({
          entity: "contract",
          entityId: contract.id,
          action: "status_changed",
          actorId,
          data: { old: "fully_paid", new: "active", reason: "Върнат статус на плащане" },
        });
      }
    });

    revalidatePath("/admin", "layout");
    return { success: true, data: undefined };
  } catch (error) {
    console.error("[revert-payment] failed", error);
    return { success: false, error: "Възникна грешка при запазването. Моля опитайте отново." };
  }
}
