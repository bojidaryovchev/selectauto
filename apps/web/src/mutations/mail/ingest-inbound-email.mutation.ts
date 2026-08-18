import { desc, eq, sql } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import { bareAddress, displayName, subjectKey, type InboundEmailInput } from "@/lib/inbound-mail";

/**
 * Persist one `email.received` event into the admin inbox.
 *
 * A plain (non-action) server helper — called only by `/api/resend-inbound`,
 * never exposed to the client, so it carries no `"use server"` and no session
 * guard (the webhook's signature verification is the boundary).
 *
 * IDEMPOTENT. Webhook delivery is at-least-once and Resend retries on 5xx, so
 * this inserts the message with `ON CONFLICT (resend_email_id) DO NOTHING` and
 * reports which happened. A redelivery must not add a second inbox row, and —
 * just as important — must not bump the thread's unread flag a second time.
 *
 * BODY IS NOT FETCHED HERE. The webhook payload is metadata only, and the
 * follow-up `emails.receiving.get()` shares a 10 req/s TEAM-wide limit with the
 * app's password-reset and verification sends. A burst of inbound must not
 * starve those, so the body is pulled lazily on first admin open (and by the
 * reconcile cron) — `body_fetched_at` stays NULL until then.
 */

/** How many recent threads for one participant to consider when matching. */
const THREAD_MATCH_WINDOW = 20;

export type IngestResult =
  | { status: "inserted"; threadId: number; messageId: number }
  | { status: "duplicate"; threadId: number; messageId: number };

export async function ingestInboundEmail(data: InboundEmailInput): Promise<IngestResult> {
  const db = getDb();

  const participantEmail = bareAddress(data.from);
  const participantName = displayName(data.from);
  const key = subjectKey(data.subject);
  // Resend's `created_at` is the MESSAGE time; webhook arrival order is not
  // guaranteed, so this — not now() — is what the thread is ordered by.
  const messageAt = new Date(data.createdAt);

  return db.transaction(async (tx) => {
    // Fast path for a redelivered event: if we already hold this Resend id,
    // change nothing at all and report the existing rows.
    const existing = await tx
      .select({ id: schema.emailMessages.id, threadId: schema.emailMessages.threadId })
      .from(schema.emailMessages)
      .where(eq(schema.emailMessages.resendEmailId, data.emailId))
      .limit(1);
    if (existing[0]) {
      return { status: "duplicate", threadId: existing[0].threadId, messageId: existing[0].id };
    }

    // Find this participant's thread with the same normalized subject. Bounded
    // candidate set matched in JS rather than an expression predicate in SQL, so
    // the plain `email_threads_participant_idx` serves it and the normalisation
    // rule lives in exactly one place (lib/inbound-mail.ts).
    const candidates = await tx
      .select({
        id: schema.emailThreads.id,
        subject: schema.emailThreads.subject,
        referencesChain: schema.emailThreads.referencesChain,
      })
      .from(schema.emailThreads)
      .where(eq(schema.emailThreads.participantEmail, participantEmail))
      .orderBy(desc(schema.emailThreads.lastMessageAt))
      .limit(THREAD_MATCH_WINDOW);

    const match = candidates.find((t) => subjectKey(t.subject) === key);

    let threadId: number;
    if (match) {
      threadId = match.id;
      await tx
        .update(schema.emailThreads)
        .set({
          unread: true,
          lastDirection: "inbound",
          // GREATEST so an out-of-order redelivery can't drag the thread
          // backwards in the list.
          lastMessageAt: sql`greatest(${schema.emailThreads.lastMessageAt}, ${messageAt})`,
          // Append this Message-ID to the chain a reply will send as References.
          referencesChain: sql`
            CASE WHEN ${data.messageId} = ANY(${schema.emailThreads.referencesChain})
                 THEN ${schema.emailThreads.referencesChain}
                 ELSE array_append(${schema.emailThreads.referencesChain}, ${data.messageId})
            END`,
          participantName: participantName ?? sql`${schema.emailThreads.participantName}`,
          updatedAt: new Date(),
        })
        .where(eq(schema.emailThreads.id, threadId));
    } else {
      const inserted = await tx
        .insert(schema.emailThreads)
        .values({
          subject: data.subject,
          participantEmail,
          participantName,
          status: "new",
          lastMessageAt: messageAt,
          lastDirection: "inbound",
          unread: true,
          referencesChain: [data.messageId],
        })
        .returning({ id: schema.emailThreads.id });
      threadId = inserted[0].id;
    }

    // The UNIQUE on resend_email_id is the real guard: two concurrent
    // redeliveries can both miss the SELECT above, and only one may insert.
    const messageRows = await tx
      .insert(schema.emailMessages)
      .values({
        threadId,
        direction: "inbound",
        resendEmailId: data.emailId,
        messageId: data.messageId,
        fromAddress: participantEmail,
        fromName: participantName,
        toAddresses: data.to,
        ccAddresses: data.cc,
        receivedFor: data.receivedFor,
        subject: data.subject,
        hasAttachments: data.attachments.length > 0,
        createdAt: messageAt,
      })
      .onConflictDoNothing({ target: schema.emailMessages.resendEmailId })
      .returning({ id: schema.emailMessages.id });

    if (!messageRows[0]) {
      // Lost the race — the other transaction owns the row.
      const raced = await tx
        .select({ id: schema.emailMessages.id, threadId: schema.emailMessages.threadId })
        .from(schema.emailMessages)
        .where(eq(schema.emailMessages.resendEmailId, data.emailId))
        .limit(1);
      return { status: "duplicate", threadId, messageId: raced[0]?.id ?? 0 };
    }

    const messageId = messageRows[0].id;

    // Attachment metadata only — Resend's download URLs expire in 1 hour and are
    // deliberately never stored.
    if (data.attachments.length > 0) {
      await tx.insert(schema.emailAttachments).values(
        data.attachments.map((a) => ({
          messageId,
          resendAttachmentId: a.id,
          filename: a.filename,
          contentType: a.contentType,
          contentDisposition: a.contentDisposition,
          contentId: a.contentId,
          sizeBytes: a.size,
        })),
      );
    }

    return { status: "inserted", threadId, messageId };
  });
}
