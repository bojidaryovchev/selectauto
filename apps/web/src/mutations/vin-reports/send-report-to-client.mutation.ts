"use server";

import { MAIL_FROM } from "@/constants/mail";
import { VIN_REPORT_PROVIDER_LABEL } from "@/constants/vin-reports";
import { getAdminSession } from "@/lib/admin";
import { getDb, schema } from "@/lib/db";
import { getResend } from "@/lib/email";
import { subjectKey } from "@/lib/inbound-mail";
import { formatSofiaDateTime } from "@/lib/sofia-time";
import { fetchReportPdf } from "@/lib/vin-report-api";
import {
  leadEmailAddress,
  VIN_REPORT_EMAIL_MAX_LENGTH,
  vinReportEmailSubject,
  vinReportPdfFilename,
} from "@/lib/vin-report-email";
import { isReportProvider, normalizeVin } from "@/lib/vin-report-parse";
import type { ActionResult } from "@/types/action-result.type";
import { and, desc, eq, gt, inArray, isNull, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";

/**
 * E-mail a bought Carfax / AutoCheck report to the client of a Carfax lead, with its PDF attached — the lead
 * drawer's „Изпратете на клиента", and the VIN desk's after a purchase for a lead.
 *
 * It goes out exactly like a reply from /admin/poshta (mutations/mail/send-reply.mutation.ts), because that is what
 * it is: staff writing to a customer as info@selectauto.bg. info@ has no mailbox and no Sent folder, so the e-mail is
 * filed as a conversation in Поща — the only record of what was sent — and the client's answer, which the inbox files
 * by sender and subject (lib/inbound-mail.ts), lands in the same conversation.
 *
 * Admin-only (`getAdminSession`), like replies: it speaks for the business to a customer. The guard is the first
 * statement, since a server action is a POST anyone may forge.
 *
 * ── The order of operations ─────────────────────────────────────────────────
 *  1. Validate on the server: the report is ready with a PDF, the lead has an address that can take mail, and the
 *     report is for the lead's VIN. The browser sends only the two ids and the text.
 *  2. Download the PDF FIRST: a dead link fails here, before anything is written or sent.
 *  3. File the message as `sending` in the client's conversation (the one with this subject, or a new one), with
 *     the attachment's metadata. Its row id keys the idempotency key, so a retried request can't send twice; a send
 *     of the same report to the same client in the last 2 minutes (two people at once) is refused.
 *  4. Send. A failure fails the action and marks the message `failed` — never „looks sent".
 *  5. Record: the message sent, the conversation moved on, the report tied to the lead (if it wasn't), and the log
 *     („Отчет изпратен на клиента", which the drawer reads to say when it was sent).
 */

export type SendVinReportInput = {
  reportId: number;
  leadId: number;
  /** The e-mail's text as staff left it in the dialog. */
  body: string;
};

export type SendVinReportResult = {
  threadId: number;
  /** „24.11.2026 г., 14:05". */
  sentAtText: string;
};

class RecentSend extends Error {}

export async function sendVinReportToClient(input: SendVinReportInput): Promise<ActionResult<SendVinReportResult>> {
  const session = await getAdminSession();
  if (!session) return { success: false, error: "Нямате достъп до тази операция." };
  const actorId = session.user?.id ?? null;

  // 1. Validate.
  const reportId = Number(input?.reportId);
  const leadId = Number(input?.leadId);
  if (!Number.isInteger(reportId) || reportId <= 0 || !Number.isInteger(leadId) || leadId <= 0) {
    return { success: false, error: "Невалиден идентификатор." };
  }
  const body = (input?.body ?? "").trim();
  if (!body) return { success: false, error: "Писмото не може да е празно." };
  if (body.length > VIN_REPORT_EMAIL_MAX_LENGTH) return { success: false, error: "Писмото е твърде дълго." };

  const db = getDb();
  const r = schema.vinReports;
  const l = schema.carfaxRequests;
  const [report] = await db
    .select({
      id: r.id,
      provider: r.provider,
      vin: r.vin,
      status: r.status,
      pdfUrl: r.pdfUrl,
      leadId: r.carfaxRequestId,
    })
    .from(r)
    .where(eq(r.id, reportId));
  if (!report) return { success: false, error: "Отчетът не е намерен." };
  if (report.status !== "ready" || !report.pdfUrl) return { success: false, error: "Отчетът още няма PDF файл." };

  const [lead] = await db
    .select({ id: l.id, name: l.fullName, email: l.email, vin: l.vin })
    .from(l)
    .where(eq(l.id, leadId));
  if (!lead) return { success: false, error: "Запитването не е намерено." };
  const to = leadEmailAddress(lead.email);
  if (!to) {
    return { success: false, error: "Клиентът не е оставил валиден имейл. Изпратете отчета по друг начин." };
  }
  if (normalizeVin(lead.vin) !== report.vin) {
    return { success: false, error: `Отчетът е за VIN ${report.vin}, а запитването — за ${lead.vin}.` };
  }

  const provider = isReportProvider(report.provider) ? report.provider : "carfax";
  const label = VIN_REPORT_PROVIDER_LABEL[provider];
  const subject = vinReportEmailSubject(label, report.vin);
  const filename = vinReportPdfFilename(label, report.vin);
  const logFields = { reportId, leadId, user: session.user?.email ?? null };

  // 2. The file first.
  let pdf: Buffer;
  try {
    pdf = await fetchReportPdf(report.pdfUrl);
  } catch (error) {
    console.error("[vin-reports] report PDF download failed", { ...logFields, error });
    return {
      success: false,
      error: "Файлът на отчета не можа да се изтегли от AuctionsAPI. Нищо не е изпратено — опитайте отново след малко.",
    };
  }

  // 3. The conversation, and the message as `sending`.
  const t = schema.emailThreads;
  const m = schema.emailMessages;
  let filed: { threadId: number; messageRowId: number; inReplyTo: string | null; references: string[] };
  try {
    filed = await db.transaction(async (tx) => {
      const key = subjectKey(subject);
      const candidates = await tx
        .select({ id: t.id, subject: t.subject, referencesChain: t.referencesChain })
        .from(t)
        .where(eq(t.participantEmail, to))
        .orderBy(desc(t.lastMessageAt))
        .limit(20);
      const match = candidates.find((c) => subjectKey(c.subject) === key);
      let threadId: number;
      let references: string[] = [];
      if (match) {
        threadId = match.id;
        references = match.referencesChain;
        const recent = await tx
          .select({ id: m.id })
          .from(m)
          .where(
            and(
              eq(m.threadId, threadId),
              eq(m.direction, "outbound"),
              inArray(m.deliveryState, ["sending", "sent"]),
              gt(m.createdAt, sql`now() - interval '2 minutes'`),
            ),
          )
          .limit(1);
        if (recent.length > 0) throw new RecentSend();
      } else {
        const [created] = await tx
          .insert(t)
          .values({
            subject,
            participantEmail: to,
            participantName: lead.name,
            // We wrote first and wait for the client: an open conversation, nothing unread.
            status: "in_progress",
            lastMessageAt: new Date(),
            lastDirection: "outbound",
            unread: false,
            referencesChain: [],
          })
          .returning({ id: t.id });
        threadId = created.id;
      }
      // A reply to the client's last message in this conversation, if there is one (as Поща's replies do).
      const [lastInbound] = await tx
        .select({ messageId: m.messageId })
        .from(m)
        .where(and(eq(m.threadId, threadId), eq(m.direction, "inbound")))
        .orderBy(desc(m.createdAt))
        .limit(1);
      const inReplyTo = lastInbound?.messageId ?? null;
      const [message] = await tx
        .insert(m)
        .values({
          threadId,
          direction: "outbound",
          fromAddress: MAIL_FROM.address,
          fromName: MAIL_FROM.name,
          toAddresses: [to],
          subject,
          textBody: body,
          inReplyTo,
          referencesHeader: references,
          sentByUserId: actorId,
          deliveryState: "sending",
          bodyFetchedAt: new Date(),
          hasAttachments: true,
        })
        .returning({ id: m.id });
      await tx.insert(schema.emailAttachments).values({
        messageId: message.id,
        filename,
        contentType: "application/pdf",
        contentDisposition: "attachment",
        sizeBytes: pdf.length,
      });
      return { threadId, messageRowId: message.id, inReplyTo, references };
    });
  } catch (error) {
    if (error instanceof RecentSend) {
      return {
        success: false,
        error: "Този отчет току-що беше изпратен на клиента (от вас или друг потребител). Проверете разговора в Поща.",
      };
    }
    console.error("[vin-reports] could not file the e-mail", { ...logFields, error });
    return { success: false, error: "Възникна грешка при запазването. Нищо не е изпратено — опитайте отново." };
  }

  // 4. Send.
  const headers: Record<string, string> = {};
  if (filed.inReplyTo) headers["In-Reply-To"] = filed.inReplyTo;
  if (filed.references.length > 0) headers["References"] = filed.references.join(" ");
  let sendId: string;
  try {
    const response = await getResend().emails.send(
      {
        from: `${MAIL_FROM.name} <${MAIL_FROM.address}>`,
        to,
        subject,
        text: body,
        headers,
        attachments: [{ filename, content: pdf, contentType: "application/pdf" }],
      },
      { idempotencyKey: `vin-report-mail-${filed.messageRowId}` },
    );
    if (response.error || !response.data) throw new Error(response.error?.message ?? "no data returned");
    sendId = response.data.id;
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    console.error("[vin-reports] report e-mail failed", { ...logFields, messageRowId: filed.messageRowId, detail });
    await db
      .update(m)
      .set({ deliveryState: "failed", deliveryError: detail.slice(0, 500) })
      .where(eq(m.id, filed.messageRowId));
    revalidatePath("/admin", "layout");
    return { success: false, error: "Изпращането не бе успешно. Писмото е запазено в Поща, но НЕ е изпратено." };
  }

  // 5. Record. The e-mail is out whatever happens here, so a failure is logged, not reported as a failed send.
  const sentAt = new Date();
  try {
    await db.transaction(async (tx) => {
      await tx.update(m).set({ deliveryState: "sent", resendSendId: sendId }).where(eq(m.id, filed.messageRowId));
      await tx
        .update(t)
        .set({
          lastMessageAt: sentAt,
          lastDirection: "outbound",
          unread: false,
          status: sql`CASE WHEN ${t.status} = 'new' THEN 'in_progress' ELSE ${t.status} END`,
          updatedAt: sentAt,
        })
        .where(eq(t.id, filed.threadId));
      // A report bought without a lead in view now belongs to the one it was sent to.
      await tx
        .update(r)
        .set({ carfaxRequestId: lead.id, updatedAt: sentAt })
        .where(and(eq(r.id, report.id), isNull(r.carfaxRequestId)));
      // No address in the log (it is never purged): the lead and the conversation are named by id.
      await tx.insert(schema.contractEvents).values({
        entity: "vin_report",
        entityId: report.id,
        action: "sent_to_client",
        actorId,
        data: { vin: report.vin, provider, carfaxRequestId: lead.id, threadId: filed.threadId },
      });
    });
  } catch (error) {
    console.error("[vin-reports] report e-mail sent but not recorded", { ...logFields, sendId, error });
  }

  console.log("[vin-reports] report e-mailed", { ...logFields, threadId: filed.threadId, sendId });
  revalidatePath("/admin", "layout");
  return { success: true, data: { threadId: filed.threadId, sentAtText: formatSofiaDateTime(sentAt) } };
}
