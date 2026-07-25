"use server";

import { and, eq, isNull, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { STAGE_ALLOWED_RECIPIENT_KINDS, type PaymentStage } from "@/constants/contracts";
import { getAdminSession } from "@/lib/admin";
import { getDb, schema } from "@/lib/db";
import { centsToDb } from "@/lib/money";
import { buildNoticeSnapshot } from "@/lib/notice";
import { isDocumentStorageConfigured, putDocument } from "@/lib/s3";
import { renderPaymentNoticePdf } from "@/pdf/render";
import type { ActionResult } from "@/types/action-result.type";

export type GeneratePaymentNoticeInput = {
  paymentId: number;
  recipientId: number;
  /** Курс USD→EUR — REQUIRED iff us_ca contract + SelectAuto recipient (§16). */
  usdEurRate?: string;
  /** Per-stage основание override (customs references etc. — §5.3). */
  basis?: string;
  /** Падеж (optional, ISO date). */
  dueDate?: string;
};

/** Today as YYYY-MM-DD in Europe/Sofia. */
function todaySofia(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Sofia" }).format(new Date());
}

/**
 * Admin-only: generate a payment notice for one stage (spec §6). Validates the
 * §5/§10/§16 matrix server-side (the UI already hides invalid options):
 *
 *  - recipient kind allowed for the stage; recipient active;
 *  - курс: required positive decimal for us_ca+SelectAuto, FORBIDDEN otherwise;
 *  - recipient bank data complete, else generation blocks with a clear message.
 *
 * Then freezes a NoticeSnapshot and, in one transaction: inserts the next
 * `generated_documents` version for this stage (append-only — regeneration adds
 * v+1, §10), stores the recipient/основание/падеж on the payment, flips
 * 'not_requested' → 'awaiting_payment' (§6.4), and appends the audit event.
 * The PDF itself is rendered on download from the frozen snapshot, so any
 * version stays byte-reproducible forever.
 */
export async function generatePaymentNotice(
  input: GeneratePaymentNoticeInput,
): Promise<ActionResult<{ documentId: number; version: number }>> {
  const session = await getAdminSession();
  if (!session) return { success: false, error: "Нямате достъп до тази операция." };

  const paymentId = input?.paymentId;
  const recipientId = input?.recipientId;
  if (!Number.isInteger(paymentId) || paymentId <= 0 || !Number.isInteger(recipientId) || recipientId <= 0) {
    return { success: false, error: "Невалидни данни." };
  }
  const dueDate = input?.dueDate?.trim() || null;
  if (dueDate && !/^\d{4}-\d{2}-\d{2}$/.test(dueDate)) {
    return { success: false, error: "Невалиден падеж." };
  }

  const db = getDb();

  try {
    const p = schema.contractPayments;
    const [payment] = await db.select().from(p).where(eq(p.id, paymentId));
    if (!payment) return { success: false, error: "Плащането не е намерено." };

    const [contract] = await db.select().from(schema.contracts).where(eq(schema.contracts.id, payment.contractId));
    if (!contract) return { success: false, error: "Договорът не е намерен." };
    if (contract.status === "cancelled") {
      return { success: false, error: "Договорът е анулиран — известия не се генерират." };
    }

    const r = schema.paymentRecipients;
    const [recipient] = await db.select().from(r).where(eq(r.id, recipientId));
    if (!recipient) return { success: false, error: "Получателят не е намерен." };
    if (!recipient.active) return { success: false, error: "Получателят е деактивиран." };

    // §5: recipient kind must be allowed for this stage (hidden in the UI, but
    // enforced here — defence-in-depth).
    const allowedKinds = STAGE_ALLOWED_RECIPIENT_KINDS[payment.stage as PaymentStage];
    if (!allowedKinds || !allowedKinds.includes(recipient.kind as (typeof allowedKinds)[number])) {
      return { success: false, error: "Този получател не е допустим за този етап на плащане." };
    }

    // §16: курс required iff us_ca + SelectAuto; forbidden in every other case.
    const needsRate = contract.market === "us_ca" && recipient.kind === "selectauto";
    let usdEurRate: number | null = null;
    if (needsRate) {
      const raw = input?.usdEurRate?.trim().replace(",", ".") ?? "";
      const rate = Number(raw);
      if (!raw || !Number.isFinite(rate) || rate <= 0 || rate >= 100) {
        return { success: false, error: "Въведете валиден положителен курс USD/EUR." };
      }
      usdEurRate = Math.round(rate * 1e6) / 1e6;
    } else if (input?.usdEurRate?.trim()) {
      return { success: false, error: "За този получател не се използва валутен курс." };
    }

    // §10: bank data must be complete before a notice can be generated.
    if (!recipient.bankName || !recipient.iban || !recipient.swiftBic) {
      return {
        success: false,
        error: `Банковите данни на „${recipient.name}“ са непълни — попълнете ги в Получатели преди генериране.`,
      };
    }

    // The Издал block comes from the fixed SelectAuto row.
    const [issuer] = await db.select().from(r).where(eq(r.slug, "selectauto"));
    if (!issuer) return { success: false, error: "Липсва конфигурираният получател SelectAuto." };

    // The deposit row, only when the vehicle stage carries a deduction (§14.2).
    const deposit =
      payment.stage === "vehicle" && contract.depositContractId
        ? (
            await db
              .select()
              .from(schema.depositContracts)
              .where(eq(schema.depositContracts.id, contract.depositContractId))
          )[0] ?? null
        : null;

    const basis = input?.basis?.trim() || payment.basis || contract.paymentBasis || `Договор № ${contract.number}`;
    const snapshot = buildNoticeSnapshot({
      contract,
      payment,
      recipient,
      issuer,
      deposit,
      usdEurRate,
      noticeDate: todaySofia(),
      basis,
    });

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
          recipientId,
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
          recipientId,
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
