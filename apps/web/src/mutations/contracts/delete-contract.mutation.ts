"use server";

import { and, eq, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getAdminSession } from "@/lib/admin";
import { getDb, schema } from "@/lib/db";
import { deleteDocument, isDocumentStorageConfigured } from "@/lib/s3";
import type { ActionResult } from "@/types/action-result.type";

/**
 * Admin-only: permanently delete a CANCELLED contract — the way to clear a
 * mistaken entry out of the register instead of leaving „Анулиран" rows in the
 * list forever (owner, 07.2026: "анулирания да го махнем").
 *
 * Deliberately restricted to `cancelled`: an active or paid contract is business
 * history and must be cancelled first, which is itself an audited decision. The
 * whole tree goes — stages, generated documents, attachments, events — plus the
 * S3 objects, so nothing is orphaned in the bucket. A deposit that was deducted
 * into this contract is RELEASED back to 'paid' so it can be used again.
 */
export async function deleteContract(id: number): Promise<ActionResult<{ number: string }>> {
  const session = await getAdminSession();
  if (!session) return { success: false, error: "Нямате достъп до тази операция." };
  if (!Number.isInteger(id) || id <= 0) return { success: false, error: "Невалиден идентификатор." };

  const db = getDb();

  try {
    const [contract] = await db.select().from(schema.contracts).where(eq(schema.contracts.id, id));
    if (!contract) return { success: false, error: "Договорът не е намерен." };
    if (contract.status !== "cancelled") {
      return {
        success: false,
        error: "Само анулиран договор може да бъде изтрит. Първо променете статуса на „Анулиран“.",
      };
    }

    // Collect the S3 keys before the rows disappear.
    const paymentIds = (
      await db
        .select({ id: schema.contractPayments.id })
        .from(schema.contractPayments)
        .where(eq(schema.contractPayments.contractId, id))
    ).map((p) => p.id);

    const docKeys = (
      await db
        .select({ key: schema.generatedDocuments.pdfS3Key })
        .from(schema.generatedDocuments)
        .where(eq(schema.generatedDocuments.contractId, id))
    )
      .map((d) => d.key)
      .filter((k): k is string => Boolean(k));

    const attachmentKeys = paymentIds.length
      ? (
          await db
            .select({ key: schema.paymentAttachments.s3Key })
            .from(schema.paymentAttachments)
            .where(inArray(schema.paymentAttachments.paymentId, paymentIds))
        ).map((a) => a.key)
      : [];

    await db.transaction(async (tx) => {
      if (paymentIds.length) {
        await tx.delete(schema.paymentAttachments).where(inArray(schema.paymentAttachments.paymentId, paymentIds));
        // Stage-level history — scoped to entity='payment', since entity_id is
        // only unique WITHIN an entity type.
        await tx
          .delete(schema.contractEvents)
          .where(and(eq(schema.contractEvents.entity, "payment"), inArray(schema.contractEvents.entityId, paymentIds)));
      }
      await tx
        .delete(schema.contractEvents)
        .where(and(eq(schema.contractEvents.entity, "contract"), eq(schema.contractEvents.entityId, id)));
      await tx.delete(schema.generatedDocuments).where(eq(schema.generatedDocuments.contractId, id));
      await tx.delete(schema.contractPayments).where(eq(schema.contractPayments.contractId, id));

      // Release a deducted deposit so it can be applied to another contract.
      if (contract.depositContractId) {
        await tx
          .update(schema.depositContracts)
          .set({ status: "paid", updatedBy: session.user?.id ?? null, updatedAt: new Date() })
          .where(eq(schema.depositContracts.id, contract.depositContractId));
      }

      await tx.delete(schema.contracts).where(eq(schema.contracts.id, id));

      // The contract's own trail goes too, but the deletion itself is recorded.
      await tx.insert(schema.contractEvents).values({
        entity: "contract",
        entityId: id,
        action: "deleted",
        actorId: session.user?.id ?? null,
        data: { number: contract.number, market: contract.market, total: contract.totalAmount },
      });
    });

    // Best-effort bucket cleanup — a stale object is harmless next to a failed delete.
    if (isDocumentStorageConfigured()) {
      for (const key of [...docKeys, ...attachmentKeys]) {
        try {
          await deleteDocument(key);
        } catch (error) {
          console.error("[delete-contract] could not remove S3 object", key, error);
        }
      }
    }

    revalidatePath("/admin", "layout");
    return { success: true, data: { number: contract.number } };
  } catch (error) {
    console.error("[delete-contract] failed", error);
    return { success: false, error: "Възникна грешка при изтриването. Моля опитайте отново." };
  }
}
