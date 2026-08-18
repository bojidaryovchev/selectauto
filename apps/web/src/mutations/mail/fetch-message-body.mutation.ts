import { and, asc, eq, isNull } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import { getResend } from "@/lib/email";
import { bareAddress } from "@/lib/inbound-mail";

/**
 * Pull the body of an already-ingested inbound message.
 *
 * Resend's `email.received` webhook is METADATA ONLY ("Webhooks do not include
 * the email body, headers, or attachments, only their metadata"), so a second
 * API call is always required. It is deliberately NOT made inside the webhook:
 * the 10 req/s limit is per TEAM and shared with password-reset, verification
 * and calculator sends, so a burst of inbound could otherwise lock real users
 * out of signing up. Instead the body is fetched on first admin open, with the
 * reconcile cron sweeping anything nobody opened.
 *
 * `html_format: "cid"` on purpose: the default `data_uri` inlines every image as
 * base64, which would bloat every row by megabytes. With `cid` the HTML keeps
 * `cid:` references and the bytes stay in Resend until an attachment is asked
 * for.
 *
 * Plain (non-action) server helpers — the callers are an admin query and the
 * cron route, both already gated.
 */

/** Case-insensitive header lookup (Resend returns them as sent). */
function header(headers: Record<string, string> | null, name: string): string | undefined {
  if (!headers) return undefined;
  const found = Object.keys(headers).find((k) => k.toLowerCase() === name.toLowerCase());
  return found ? headers[found] : undefined;
}

/** `"<a@x> <b@y>"` → `["<a@x>", "<b@y>"]`. */
function parseReferences(value: string | undefined): string[] {
  if (!value) return [];
  return value.split(/\s+/).filter(Boolean);
}

/**
 * Fetch and store one message's body. Returns true when the body is present
 * afterwards (already-fetched counts as success). Never throws — a failure is
 * logged and left for the next attempt, so opening a thread can't 500 because
 * Resend hiccuped.
 */
export async function fetchMessageBody(messageRowId: number): Promise<boolean> {
  const db = getDb();

  const rows = await db
    .select({
      id: schema.emailMessages.id,
      resendEmailId: schema.emailMessages.resendEmailId,
      bodyFetchedAt: schema.emailMessages.bodyFetchedAt,
    })
    .from(schema.emailMessages)
    .where(eq(schema.emailMessages.id, messageRowId))
    .limit(1);

  const message = rows[0];
  if (!message) return false;
  if (message.bodyFetchedAt !== null) return true;
  if (!message.resendEmailId) return false;

  try {
    const response = await getResend().emails.receiving.get(message.resendEmailId, {
      html_format: "cid",
    });
    if (response.error || !response.data) {
      console.error("[mail] body fetch failed", message.resendEmailId, response.error);
      return false;
    }

    const full = response.data;
    const headers = full.headers ?? null;
    const replyTo = full.reply_to?.[0];

    await db
      .update(schema.emailMessages)
      .set({
        textBody: full.text,
        htmlBody: full.html,
        headers,
        replyToAddress: replyTo ? bareAddress(replyTo) : null,
        inReplyTo: header(headers, "in-reply-to") ?? null,
        referencesHeader: parseReferences(header(headers, "references")),
        bodyFetchedAt: new Date(),
      })
      .where(eq(schema.emailMessages.id, message.id));

    // Attachment sizes are only known from the full record; backfill them so the
    // UI can show a size without another round trip.
    for (const attachment of full.attachments ?? []) {
      await db
        .update(schema.emailAttachments)
        .set({ sizeBytes: attachment.size ?? null, filename: attachment.filename ?? null })
        .where(eq(schema.emailAttachments.resendAttachmentId, attachment.id));
    }

    return true;
  } catch (error) {
    console.error("[mail] body fetch threw", message.resendEmailId, error);
    return false;
  }
}

/**
 * Sweep messages whose body was never fetched (nobody opened the thread, or a
 * fetch failed). Oldest first, capped — the cron runs often enough that a cap is
 * better than an unbounded burst against the shared rate limit.
 */
export async function fetchPendingMessageBodies(limit = 25): Promise<{ attempted: number; fetched: number }> {
  const db = getDb();

  const pending = await db
    .select({ id: schema.emailMessages.id })
    .from(schema.emailMessages)
    .where(
      and(
        eq(schema.emailMessages.direction, "inbound"),
        isNull(schema.emailMessages.bodyFetchedAt),
      ),
    )
    .orderBy(asc(schema.emailMessages.createdAt))
    .limit(limit);

  let fetched = 0;
  for (const row of pending) {
    if (await fetchMessageBody(row.id)) fetched += 1;
  }
  return { attempted: pending.length, fetched };
}
