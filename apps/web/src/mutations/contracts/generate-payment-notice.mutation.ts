"use server";

import { and, eq, isNull, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getSessionWith } from "@/lib/admin";
import { getDb, schema } from "@/lib/db";
import { centsToDb } from "@/lib/money";
import { prepareNotice, type PaymentNoticeInput } from "@/lib/prepare-notice";
import { isDocumentStorageConfigured, putDocument } from "@/lib/s3";
import { renderPaymentNoticePdf } from "@/pdf/render";
import type { ActionResult } from "@/types/action-result.type";

export type GeneratePaymentNoticeInput = PaymentNoticeInput;

/**
 * Needs `notices.generate`: generate a payment notice for one stage (spec §6).
 * `prepareNotice` validates the §5/§10/§16 matrix server-side and freezes the
 * NoticeSnapshot — the same code the preview runs, so the operator confirms
 * exactly what gets issued.
 *
 * Then, in one transaction: inserts the next `generated_documents` version for
 * this stage (append-only — regeneration adds v+1, §10), stores the
 * recipient/основание/падеж on the payment, flips 'not_requested' →
 * 'awaiting_payment' (§6.4), and appends the audit event. The PDF is rendered
 * from the frozen snapshot, so any version can be rendered again for download.
 */
export async function generatePaymentNotice(
  input: GeneratePaymentNoticeInput,
): Promise<ActionResult<{ documentId: number; version: number }>> {
  const session = await getSessionWith("notices.generate");
  if (!session) return { success: false, error: "Нямате достъп до тази операция." };

  const db = getDb();

  try {
    const prepared = await prepareNotice(input);
    if (!prepared.ok) return { success: false, error: prepared.error };
    const { snapshot, contract, payment, recipient, usdEurRate, overrideCents, basis, dueDate } = prepared.notice;
    const paymentId = payment.id;
    const p = schema.contractPayments;

    const actorId = session.user?.id ?? null;
    const created = await db.transaction(async (tx) => {
      // Next version for THIS stage (append-only; unique index guards races).
      const g = schema.generatedDocuments;
      const versionRes = await tx
        .select({ max: sql<number>`COALESCE(MAX(${g.version}), 0)` })
        .from(g)
        .where(and(eq(g.paymentId, paymentId), isNull(g.depositContractId)));
      const version = Number(versionRes[0]?.max ?? 0) + 1;

      const [doc] = await tx
        .insert(g)
        .values({
          kind: "payment_notice",
          contractId: contract.id,
          paymentId,
          version,
          recipientId: recipient.id,
          snapshot,
          ...(snapshot.variant === "selectauto_usd" && usdEurRate
            ? {
                amountUsd: centsToDb(snapshot.lines.reduce((s, l) => s + l.amountCents, 0)),
                usdEurRate: String(usdEurRate),
                amountEur: centsToDb(snapshot.totalCents),
              }
            : {}),
          generatedBy: actorId,
        })
        .returning({ id: g.id, version: g.version });

      // Store the operator's choices on the stage + flip the status (§6.4);
      // paid/partial stages keep their payment state.
      await tx
        .update(p)
        .set({
          recipientId: recipient.id,
          basis,
          dueDate,
          status: payment.status === "not_requested" || payment.status === "overdue" ? "awaiting_payment" : payment.status,
          updatedAt: new Date(),
        })
        .where(eq(p.id, paymentId));

      await tx.insert(schema.contractEvents).values({
        entity: "payment",
        entityId: paymentId,
        action: "document_generated",
        actorId,
        data: {
          contractNumber: contract.number,
          stage: payment.stage,
          version,
          recipient: recipient.name,
          total: centsToDb(snapshot.totalCents),
          currency: snapshot.totalCurrencyLabel,
          ...(usdEurRate ? { usdEurRate } : {}),
          ...(overrideCents != null ? { typedAmount: centsToDb(overrideCents), typedCurrency: snapshot.currency } : {}),
        },
      });

      return doc!;
    });

    // Archive the rendered PDF to the private documents bucket — AFTER the
    // transaction (never hold a DB transaction open across a network call) and
    // best-effort, like the app's email side-effects: the document row is the
    // source of truth and the PDF re-renders from its snapshot on demand, so a
    // failed upload must not fail the generation. The archived bytes matter for
    // the long run: they preserve the exact LAYOUT the client received, which a
    // later template change would otherwise alter on re-render.
    if (isDocumentStorageConfigured()) {
      try {
        const pdf = await renderPaymentNoticePdf(snapshot);
        const key = `notices/${contract.id}/${paymentId}/v${created.version}.pdf`;
        await putDocument({ key, body: pdf, contentType: "application/pdf" });
        await db
          .update(schema.generatedDocuments)
          .set({ pdfS3Key: key })
          .where(eq(schema.generatedDocuments.id, created.id));
      } catch (error) {
        console.error("[generate-payment-notice] S3 archival failed (document still generated)", error);
      }
    }

    revalidatePath("/admin", "layout");
    return { success: true, data: { documentId: created.id, version: created.version } };
  } catch (error) {
    console.error("[generate-payment-notice] failed", error);
    return { success: false, error: "Възникна грешка при генерирането. Моля опитайте отново." };
  }
}
