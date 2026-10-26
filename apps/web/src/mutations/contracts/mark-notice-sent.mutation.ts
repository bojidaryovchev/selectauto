"use server";

import { and, eq, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { canSeeRecord, getSessionWith } from "@/lib/admin";
import { getDb, schema } from "@/lib/db";
import type { ActionResult } from "@/types/action-result.type";

/**
 * Needs `notices.markSent`: mark an issued payment notice as forwarded to the
 * client — „за изпращане" → изпратено (owner, 26.10.2026: the owner issues the
 * notices, someone else sends them on). Only on a contract the user can see;
 * otherwise the same "not found" as a missing id.
 *
 * The first mark wins: the UPDATE only touches a row that is still unsent, and
 * the audit event is written only when it did — a double click can't record the
 * sending twice.
 */
export async function markNoticeSent(documentId: number): Promise<ActionResult> {
  const session = await getSessionWith("notices.markSent");
  if (!session) return { success: false, error: "Нямате достъп до тази операция." };
  if (!Number.isInteger(documentId) || documentId <= 0) {
    return { success: false, error: "Невалиден идентификатор." };
  }

  const db = getDb();
  const g = schema.generatedDocuments;
  const c = schema.contracts;
  const actorId = session.user?.id ?? null;

  try {
    const [doc] = await db
      .select({
        kind: g.kind,
        paymentId: g.paymentId,
        version: g.version,
        createdBy: c.createdBy,
        contractNumber: c.number,
      })
      .from(g)
      .innerJoin(c, eq(c.id, g.contractId))
      .where(eq(g.id, documentId));
    if (!doc || doc.kind !== "payment_notice" || !doc.paymentId || !canSeeRecord(session, doc.createdBy)) {
      return { success: false, error: "Известието не е намерено." };
    }
    const paymentId = doc.paymentId;

    await db.transaction(async (tx) => {
      const [marked] = await tx
        .update(g)
        .set({ clientSentAt: new Date(), clientSentBy: actorId })
        .where(and(eq(g.id, documentId), isNull(g.clientSentAt)))
        .returning({ id: g.id });
      if (!marked) return;

      await tx.insert(schema.contractEvents).values({
        entity: "payment",
        entityId: paymentId,
        action: "notice_sent",
        actorId,
        data: { contractNumber: doc.contractNumber, version: doc.version, documentId },
      });
    });

    revalidatePath("/admin", "layout");
    return { success: true, data: undefined };
  } catch (error) {
    console.error("[mark-notice-sent] failed", error);
    return { success: false, error: "Възникна грешка при запазването. Моля опитайте отново." };
  }
}
