"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getAdminSession } from "@/lib/admin";
import { getDb, schema } from "@/lib/db";
import { deleteDocument, isDocumentStorageConfigured } from "@/lib/s3";
import type { ActionResult } from "@/types/action-result.type";

/**
 * Admin-only: permanently delete a CANCELLED deposit contract (owner, 07.2026 —
 * "и тука ануалирания да го махнем"). Restricted to `cancelled` for the same
 * reason as contracts; a 'used' deposit additionally can't be removed because a
 * mediation contract still points at it. Generated PDFs go with it, including
 * the S3 copies.
 */
export async function deleteDeposit(id: number): Promise<ActionResult<{ number: string }>> {
  const session = await getAdminSession();
  if (!session) return { success: false, error: "Нямате достъп до тази операция." };
  if (!Number.isInteger(id) || id <= 0) return { success: false, error: "Невалиден идентификатор." };

  const db = getDb();

  try {
    const [deposit] = await db.select().from(schema.depositContracts).where(eq(schema.depositContracts.id, id));
    if (!deposit) return { success: false, error: "Депозитът не е намерен." };
    if (deposit.status !== "cancelled") {
      return {
        success: false,
        error: "Само анулиран депозит може да бъде изтрит. Първо променете статуса на „Анулиран“.",
      };
    }

    const [linked] = await db
      .select({ number: schema.contracts.number })
      .from(schema.contracts)
      .where(eq(schema.contracts.depositContractId, id));
    if (linked) {
      return { success: false, error: `Депозитът е използван по договор № ${linked.number} и не може да се изтрие.` };
    }

    const keys = (
      await db
        .select({ key: schema.generatedDocuments.pdfS3Key })
        .from(schema.generatedDocuments)
        .where(eq(schema.generatedDocuments.depositContractId, id))
    )
      .map((d) => d.key)
      .filter((k): k is string => Boolean(k));

    await db.transaction(async (tx) => {
      await tx.delete(schema.generatedDocuments).where(eq(schema.generatedDocuments.depositContractId, id));
      await tx
        .delete(schema.contractEvents)
        .where(and(eq(schema.contractEvents.entity, "deposit"), eq(schema.contractEvents.entityId, id)));
      await tx.delete(schema.depositContracts).where(eq(schema.depositContracts.id, id));
      await tx.insert(schema.contractEvents).values({
        entity: "deposit",
        entityId: id,
        action: "deleted",
        actorId: session.user?.id ?? null,
        data: { number: deposit.number, amount: deposit.depositAmount },
      });
    });

    if (isDocumentStorageConfigured()) {
      for (const key of keys) {
        try {
          await deleteDocument(key);
        } catch (error) {
          console.error("[delete-deposit] could not remove S3 object", key, error);
        }
      }
    }

    revalidatePath("/admin", "layout");
    return { success: true, data: { number: deposit.number } };
  } catch (error) {
    console.error("[delete-deposit] failed", error);
    return { success: false, error: "Възникна грешка при изтриването. Моля опитайте отново." };
  }
}
