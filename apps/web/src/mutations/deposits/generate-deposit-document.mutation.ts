"use server";

import { and, eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getAdminSession } from "@/lib/admin";
import { buildDepositDocSnapshot } from "@/lib/contract-doc";
import { getDb, schema } from "@/lib/db";
import { isDocumentStorageConfigured, putDocument } from "@/lib/s3";
import { renderContractPdf } from "@/pdf/render";
import type { ActionResult } from "@/types/action-result.type";

/**
 * Admin-only: generate the deposit contract PDF (spec §14 — "да се генерира по
 * предоставения шаблон"). Same guarantees as the other documents: the snapshot
 * is frozen at generation, regeneration appends a new version, and the bytes are
 * archived to S3 so a later template change can't alter what the client signed.
 */
export async function generateDepositDocument(
  depositId: number,
): Promise<ActionResult<{ documentId: number; version: number }>> {
  const session = await getAdminSession();
  if (!session) return { success: false, error: "Нямате достъп до тази операция." };
  if (!Number.isInteger(depositId) || depositId <= 0) {
    return { success: false, error: "Невалиден идентификатор." };
  }

  const db = getDb();
  const actorId = session.user?.id ?? null;

  try {
    const [deposit] = await db
      .select()
      .from(schema.depositContracts)
      .where(eq(schema.depositContracts.id, depositId));
    if (!deposit) return { success: false, error: "Депозитът не е намерен." };

    const snapshot = buildDepositDocSnapshot(deposit);
    if (!snapshot.client.name) {
      return { success: false, error: "Липсват данни за клиента — договорът не може да се генерира." };
    }

    const g = schema.generatedDocuments;
    const created = await db.transaction(async (tx) => {
      const versionRes = await tx
        .select({ max: sql<number>`COALESCE(MAX(${g.version}), 0)` })
        .from(g)
        .where(and(eq(g.depositContractId, depositId), eq(g.kind, "deposit_contract")));
      const version = Number(versionRes[0]?.max ?? 0) + 1;

      const [doc] = await tx
        .insert(g)
        .values({ kind: "deposit_contract", depositContractId: depositId, version, snapshot, generatedBy: actorId })
        .returning({ id: g.id, version: g.version });

      await tx.insert(schema.contractEvents).values({
        entity: "deposit",
        entityId: depositId,
        action: "document_generated",
        actorId,
        data: { number: deposit.number, version },
      });

      return doc!;
    });

    if (isDocumentStorageConfigured()) {
      try {
        const pdf = await renderContractPdf(snapshot);
        const key = `deposits/${depositId}/depozit-v${created.version}.pdf`;
        await putDocument({ key, body: pdf, contentType: "application/pdf" });
        await db.update(g).set({ pdfS3Key: key }).where(eq(g.id, created.id));
      } catch (error) {
        console.error("[generate-deposit-document] S3 archival failed (document still generated)", error);
      }
    }

    revalidatePath("/admin", "layout");
    return { success: true, data: { documentId: created.id, version: created.version } };
  } catch (error) {
    console.error("[generate-deposit-document] failed", error);
    return { success: false, error: "Възникна грешка при генерирането. Моля опитайте отново." };
  }
}
