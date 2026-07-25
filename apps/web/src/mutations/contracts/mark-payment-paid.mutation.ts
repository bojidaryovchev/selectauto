"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getAdminSession } from "@/lib/admin";
import { getDb, schema } from "@/lib/db";
import { centsToDb, dbToCents, parseAmountToCents } from "@/lib/money";
import type { ActionResult } from "@/types/action-result.type";

export type MarkPaymentPaidInput = {
  paymentId: number;
  /** Реално платена сума (може частична) — human-entered string. */
  paidAmount: string;
  /** Дата на плащане, ISO; defaults to today (Europe/Sofia). */
  paidAt?: string;
  note?: string;
};

function todaySofia(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Sofia" }).format(new Date());
}

/**
 * Admin-only: „Отбележи като платено“ (spec §4.3). Records the real paid
 * amount (partial allowed — status becomes 'partially_paid' until the due sum
 * is covered, §4.2), the payment date (editable, defaults to today) and a note.
 * Cancelled stages can't be paid. When all four stages of the contract land on
 * 'paid', the contract itself flips to 'fully_paid' (§11.8). Audited (§9);
 * reverting is a separate action that also stays in the history.
 */
export async function markPaymentPaid(input: MarkPaymentPaidInput): Promise<ActionResult> {
  const session = await getAdminSession();
  if (!session) return { success: false, error: "Нямате достъп до тази операция." };

  const paymentId = input?.paymentId;
  if (!Number.isInteger(paymentId) || paymentId <= 0) {
    return { success: false, error: "Невалиден идентификатор." };
  }
  const paidCents = parseAmountToCents(input?.paidAmount ?? "");
  if (paidCents === null || paidCents <= 0) {
    return { success: false, error: "Въведете валидна платена сума." };
  }
  const paidAt = input?.paidAt?.trim() || todaySofia();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(paidAt)) {
    return { success: false, error: "Невалидна дата на плащане." };
  }
  const note = input?.note?.trim() || null;

  const db = getDb();
  const p = schema.contractPayments;
  const actorId = session.user?.id ?? null;

  try {
    const [payment] = await db.select().from(p).where(eq(p.id, paymentId));
    if (!payment) return { success: false, error: "Плащането не е намерено." };
    if (payment.status === "cancelled") {
      return { success: false, error: "Етапът е анулиран — първо върнете статуса." };
    }

    // Cumulative: a second partial payment adds to what's already recorded.
    const newPaidCents = dbToCents(payment.paidAmount) + paidCents;
    const dueCents = dbToCents(payment.dueAmount);
    const newStatus = newPaidCents >= dueCents ? "paid" : "partially_paid";

    await db.transaction(async (tx) => {
      await tx
        .update(p)
        .set({
          paidAmount: centsToDb(newPaidCents),
          paidAt,
          note: note ?? payment.note,
          status: newStatus,
          updatedAt: new Date(),
        })
        .where(eq(p.id, paymentId));

      await tx.insert(schema.contractEvents).values({
        entity: "payment",
        entityId: paymentId,
        action: "marked_paid",
        actorId,
        data: {
          stage: payment.stage,
          amount: centsToDb(paidCents),
          totalPaid: centsToDb(newPaidCents),
          due: payment.dueAmount,
          paidAt,
          status: newStatus,
          ...(note ? { note } : {}),
        },
      });

      // §11.8: all four stages paid → the deal is fully paid.
      if (newStatus === "paid") {
        const siblings = await tx
          .select({ id: p.id, status: p.status })
          .from(p)
          .where(eq(p.contractId, payment.contractId));
        const allPaid = siblings.every((s) => s.id === paymentId || s.status === "paid");
        if (allPaid) {
          await tx
            .update(schema.contracts)
            .set({ status: "fully_paid", updatedBy: actorId, updatedAt: new Date() })
            .where(eq(schema.contracts.id, payment.contractId));
          await tx.insert(schema.contractEvents).values({
            entity: "contract",
            entityId: payment.contractId,
            action: "status_changed",
            actorId,
            data: { old: "active", new: "fully_paid", reason: "Всички етапи са платени" },
          });
        }
      }
    });

    revalidatePath("/admin", "layout");
    return { success: true, data: undefined };
  } catch (error) {
    console.error("[mark-payment-paid] failed", error);
    return { success: false, error: "Възникна грешка при запазването. Моля опитайте отново." };
  }
}
