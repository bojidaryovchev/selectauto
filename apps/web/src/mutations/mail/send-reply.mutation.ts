"use server";

import { desc, eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getAdminSession } from "@/lib/admin";
import { getDb, schema } from "@/lib/db";
import { getResend } from "@/lib/email";
import { MAIL_FROM, isMailThreadStatus } from "@/constants/mail";
import type { ActionResult } from "@/types/action-result.type";

/**
 * Reply to a thread AS `info@selectauto.bg`, and the two small thread-state
 * actions beside it.
 *
 * Admin-only (`getAdminSession`, not `getBackOfficeSession`): replying speaks for
 * the business to a customer, which is an edit-class action an „Наблюдаващ"
 * must not perform. The guard is the FIRST statement because a server action is
 * a POST reachable by anyone who can forge the request — render-time gating is
 * explicitly not a security boundary.
 *
 * ── Why this deliberately breaks the repo's best-effort email habit ──────────
 * Every other send in the app (carfax/inquiry/calculator notifications) wraps
 * Resend in try/catch, logs, and succeeds anyway — correct for a notification
 * that merely mirrors a row already saved to the database. It is WRONG here: if
 * this send fails and we report success, the admin believes the customer was
 * answered and nobody ever finds out. So a failed send fails the action, and the
 * message row is marked `failed` rather than silently left looking sent.
 */

/** Threading headers per Resend's reply guide + RFC 2822 (Gmail's docs agree). */
function replySubject(subject: string | null): string {
  const base = (subject ?? "").trim();
  if (!base) return "Re:";
  return /^re\s*:/i.test(base) ? base : `Re: ${base}`;
}

export type SendReplyInput = {
  threadId: number;
  body: string;
};

export async function sendReply(input: SendReplyInput): Promise<ActionResult> {
  const session = await getAdminSession();
  if (!session) {
    return { success: false, error: "Нямате достъп до тази операция." };
  }

  if (!Number.isInteger(input?.threadId) || input.threadId <= 0) {
    return { success: false, error: "Невалиден идентификатор." };
  }
  const body = (input.body ?? "").trim();
  if (!body) {
    return { success: false, error: "Съобщението не може да е празно." };
  }
  if (body.length > 50_000) {
    return { success: false, error: "Съобщението е твърде дълго." };
  }

  const db = getDb();

  const threadRows = await db
    .select({
      id: schema.emailThreads.id,
      subject: schema.emailThreads.subject,
      participantEmail: schema.emailThreads.participantEmail,
      referencesChain: schema.emailThreads.referencesChain,
    })
    .from(schema.emailThreads)
    .where(eq(schema.emailThreads.id, input.threadId))
    .limit(1);

  const thread = threadRows[0];
  if (!thread) {
    return { success: false, error: "Разговорът не е намерен." };
  }

  // Reply to the sender's own Reply-To when they set one — mailing lists and
  // ticketing systems depend on it. Falls back to the thread participant.
  const lastInbound = await db
    .select({
      messageId: schema.emailMessages.messageId,
      replyToAddress: schema.emailMessages.replyToAddress,
      fromAddress: schema.emailMessages.fromAddress,
    })
    .from(schema.emailMessages)
    .where(eq(schema.emailMessages.threadId, thread.id))
    .orderBy(desc(schema.emailMessages.createdAt))
    .limit(1);

  const recipient = lastInbound[0]?.replyToAddress ?? thread.participantEmail;
  const inReplyTo = lastInbound[0]?.messageId ?? null;
  const references = thread.referencesChain;
  const subject = replySubject(thread.subject);

  // Persist as `sending` FIRST so the row id can key the idempotency token: an
  // admin double-click, or a server-action retry, then reuses the same key and
  // Resend refuses to send the customer a second copy.
  let messageRowId: number;
  try {
    const inserted = await db
      .insert(schema.emailMessages)
      .values({
        threadId: thread.id,
        direction: "outbound",
        fromAddress: MAIL_FROM.address,
        fromName: MAIL_FROM.name,
        toAddresses: [recipient],
        subject,
        textBody: body,
        inReplyTo,
        referencesHeader: references,
        sentByUserId: session.user?.id ?? null,
        deliveryState: "sending",
        bodyFetchedAt: new Date(),
      })
      .returning({ id: schema.emailMessages.id });
    messageRowId = inserted[0].id;
  } catch (error) {
    console.error("[mail] reply persist failed", error);
    return { success: false, error: "Възникна грешка при запазването. Моля опитайте отново." };
  }

  const headers: Record<string, string> = {};
  if (inReplyTo) headers["In-Reply-To"] = inReplyTo;
  if (references.length > 0) headers["References"] = references.join(" ");

  try {
    const response = await getResend().emails.send(
      {
        from: `${MAIL_FROM.name} <${MAIL_FROM.address}>`,
        to: recipient,
        subject,
        text: body,
        headers,
      },
      { idempotencyKey: `mail-reply-${messageRowId}` },
    );

    if (response.error || !response.data) {
      throw new Error(response.error?.message ?? "no data returned");
    }

    await db
      .update(schema.emailMessages)
      .set({ deliveryState: "sent", resendSendId: response.data.id })
      .where(eq(schema.emailMessages.id, messageRowId));
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    console.error("[mail] reply send failed", messageRowId, detail);
    await db
      .update(schema.emailMessages)
      .set({ deliveryState: "failed", deliveryError: detail.slice(0, 500) })
      .where(eq(schema.emailMessages.id, messageRowId));
    revalidatePath("/admin", "layout");
    return {
      success: false,
      error: "Изпращането не бе успешно. Съобщението е запазено, но НЕ е изпратено.",
    };
  }

  await db
    .update(schema.emailThreads)
    .set({
      lastMessageAt: new Date(),
      lastDirection: "outbound",
      unread: false,
      // Once we have answered, "new" is no longer true.
      status: sql`CASE WHEN ${schema.emailThreads.status} = 'new' THEN 'in_progress' ELSE ${schema.emailThreads.status} END`,
      updatedAt: new Date(),
    })
    .where(eq(schema.emailThreads.id, thread.id));

  revalidatePath("/admin", "layout");
  return { success: true, data: undefined };
}

/** Clear the unread flag when an admin opens a thread. */
export async function markThreadRead(threadId: number): Promise<ActionResult> {
  if (!(await getAdminSession())) {
    return { success: false, error: "Нямате достъп до тази операция." };
  }
  if (!Number.isInteger(threadId) || threadId <= 0) {
    return { success: false, error: "Невалиден идентификатор." };
  }

  await getDb()
    .update(schema.emailThreads)
    .set({ unread: false, updatedAt: new Date() })
    .where(eq(schema.emailThreads.id, threadId));

  revalidatePath("/admin", "layout");
  return { success: true, data: undefined };
}

export async function updateThreadStatus(threadId: number, status: string): Promise<ActionResult> {
  if (!(await getAdminSession())) {
    return { success: false, error: "Нямате достъп до тази операция." };
  }
  if (!Number.isInteger(threadId) || threadId <= 0) {
    return { success: false, error: "Невалиден идентификатор." };
  }
  if (!isMailThreadStatus(status)) {
    return { success: false, error: "Невалиден статус." };
  }

  await getDb()
    .update(schema.emailThreads)
    .set({ status, updatedAt: new Date() })
    .where(eq(schema.emailThreads.id, threadId));

  revalidatePath("/admin", "layout");
  return { success: true, data: undefined };
}
