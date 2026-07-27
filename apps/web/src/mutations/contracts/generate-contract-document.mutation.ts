"use server";

import { and, eq, isNull, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getAdminSession } from "@/lib/admin";
import { buildContractDocSnapshot } from "@/lib/contract-doc";
import { getDb, schema } from "@/lib/db";
import { isDocumentStorageConfigured, putDocument } from "@/lib/s3";
import { renderContractPdf } from "@/pdf/render";
import type { ActionResult } from "@/types/action-result.type";

/**
 * Admin-only: generate the CONTRACT document itself — договор за посредничество
 * (САЩ/Канада/Корея) or договор за доставка (Европа), chosen by the market.
 *
 * Same guarantees as the payment notices (§2/§9): the snapshot is frozen at
 * generation, regeneration appends a new version and never overwrites, and the
 * rendered bytes are archived to S3 so a later template change can't alter what
 * the client signed. Kind is `contract`, so it shares the versioning index with
 * the notices without colliding (partial unique index, migration 0038).
 */
export async function generateContractDocument(
  contractId: number,
): Promise<ActionResult<{ documentId: number; version: number }>> {
  const session = await getAdminSession();
  if (!session) return { success: false, error: "Нямате достъп до тази операция." };
  if (!Number.isInteger(contractId) || contractId <= 0) {
    return { success: false, error: "Невалиден идентификатор." };
  }

  const db = getDb();
  const actorId = session.user?.id ?? null;

  try {
    const [contract] = await db.select().from(schema.contracts).where(eq(schema.contracts.id, contractId));
    if (!contract) return { success: false, error: "Договорът не е намерен." };

    const snapshot = buildContractDocSnapshot(contract);
    if (!snapshot.client.name) {
      return { success: false, error: "Липсват данни за клиента — договорът не може да се генерира." };
    }

    const g = schema.generatedDocuments;
    const created = await db.transaction(async (tx) => {
      const versionRes = await tx
        .select({ max: sql<number>`COALESCE(MAX(${g.version}), 0)` })
        .from(g)
        .where(and(eq(g.contractId, contractId), eq(g.kind, "contract"), isNull(g.paymentId)));
      const version = Number(versionRes[0]?.max ?? 0) + 1;

      const [doc] = await tx
        .insert(g)
        .values({ kind: "contract", contractId, version, snapshot, generatedBy: actorId })
        .returning({ id: g.id, version: g.version });

      await tx.insert(schema.contractEvents).values({
        entity: "contract",
        entityId: contractId,
        action: "document_generated",
        actorId,
        data: { kind: snapshot.kind, number: contract.number, version },
      });

      return doc!;
    });

    // Archive the rendered bytes (best-effort — the snapshot can always re-render).
    if (isDocumentStorageConfigured()) {
      try {
        const pdf = await renderContractPdf(snapshot);
        const key = `contracts/${contractId}/dogovor-v${created.version}.pdf`;
        await putDocument({ key, body: pdf, contentType: "application/pdf" });
        await db.update(g).set({ pdfS3Key: key }).where(eq(g.id, created.id));
      } catch (error) {
        console.error("[generate-contract-document] S3 archival failed (document still generated)", error);
      }
    }

    revalidatePath("/admin", "layout");
    return { success: true, data: { documentId: created.id, version: created.version } };
  } catch (error) {
    console.error("[generate-contract-document] failed", error);
    return { success: false, error: "Възникна грешка при генерирането. Моля опитайте отново." };
  }
}
