import { asc, eq } from "drizzle-orm";
import { getAdminSession } from "@/lib/admin";
import { getDb, schema } from "@/lib/db";
import { fetchMessageBody } from "@/mutations/mail";

/**
 * One thread with its full message list.
 *
 * THIS IS WHERE THE LAZY BODY FETCH HAPPENS. Inbound rows are stored from the
 * webhook's metadata-only payload, so the first time an admin opens a thread we
 * pull any missing bodies from Resend and re-read. Doing it here rather than in
 * the webhook keeps a burst of inbound from consuming the 10 req/s that
 * password-reset and verification sends share.
 *
 * A fetch failure is non-fatal: `fetchMessageBody` swallows and logs, so the
 * thread still renders (with an empty body and a note in the UI) instead of
 * 500ing, and the reconcile cron retries later.
 */

export type MailMessageRow = {
  id: number;
  direction: string;
  fromAddress: string;
  fromName: string | null;
  toAddresses: string[];
  subject: string | null;
  textBody: string | null;
  htmlBody: string | null;
  bodyFetchedAt: Date | null;
  deliveryState: string | null;
  deliveryError: string | null;
  hasAttachments: boolean;
  createdAt: Date;
};

export type MailThreadDetail = {
  id: number;
  subject: string | null;
  participantEmail: string;
  participantName: string | null;
  status: string;
  unread: boolean;
  messages: MailMessageRow[];
  attachments: { messageId: number; filename: string | null; contentType: string | null; sizeBytes: number | null }[];
};

const MESSAGE_COLUMNS = {
  id: schema.emailMessages.id,
  direction: schema.emailMessages.direction,
  fromAddress: schema.emailMessages.fromAddress,
  fromName: schema.emailMessages.fromName,
  toAddresses: schema.emailMessages.toAddresses,
  subject: schema.emailMessages.subject,
  textBody: schema.emailMessages.textBody,
  htmlBody: schema.emailMessages.htmlBody,
  bodyFetchedAt: schema.emailMessages.bodyFetchedAt,
  deliveryState: schema.emailMessages.deliveryState,
  deliveryError: schema.emailMessages.deliveryError,
  hasAttachments: schema.emailMessages.hasAttachments,
  createdAt: schema.emailMessages.createdAt,
};

export async function getMailThread(threadId: number): Promise<MailThreadDetail | null> {
  if (!(await getAdminSession())) throw new Error("FORBIDDEN");
  if (!Number.isInteger(threadId) || threadId <= 0) return null;

  const db = getDb();

  const threadRows = await db
    .select({
      id: schema.emailThreads.id,
      subject: schema.emailThreads.subject,
      participantEmail: schema.emailThreads.participantEmail,
      participantName: schema.emailThreads.participantName,
      status: schema.emailThreads.status,
      unread: schema.emailThreads.unread,
    })
    .from(schema.emailThreads)
    .where(eq(schema.emailThreads.id, threadId))
    .limit(1);

  const thread = threadRows[0];
  if (!thread) return null;

  let messages = await db
    .select(MESSAGE_COLUMNS)
    .from(schema.emailMessages)
    .where(eq(schema.emailMessages.threadId, threadId))
    .orderBy(asc(schema.emailMessages.createdAt));

  // Pull any bodies we never fetched, then re-read once (sequentially, to stay
  // well inside the shared per-second budget).
  const missing = messages.filter((m) => m.direction === "inbound" && m.bodyFetchedAt === null);
  if (missing.length > 0) {
    let changed = false;
    for (const m of missing) {
      if (await fetchMessageBody(m.id)) changed = true;
    }
    if (changed) {
      messages = await db
        .select(MESSAGE_COLUMNS)
        .from(schema.emailMessages)
        .where(eq(schema.emailMessages.threadId, threadId))
        .orderBy(asc(schema.emailMessages.createdAt));
    }
  }

  const attachments = await db
    .select({
      messageId: schema.emailAttachments.messageId,
      filename: schema.emailAttachments.filename,
      contentType: schema.emailAttachments.contentType,
      sizeBytes: schema.emailAttachments.sizeBytes,
    })
    .from(schema.emailAttachments)
    .innerJoin(schema.emailMessages, eq(schema.emailMessages.id, schema.emailAttachments.messageId))
    .where(eq(schema.emailMessages.threadId, threadId));

  return { ...thread, messages, attachments };
}
