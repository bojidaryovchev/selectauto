import type { EmailReceivedEvent, ListReceivingEmail } from "resend";
import { getResend } from "@/lib/email";

/**
 * The `email.received` payload. Derived from the event rather than imported
 * directly: the SDK declares `ReceivedEmailEventData` internally but does not
 * export it, while `EmailReceivedEvent` is public (resend 6.17.2).
 */
type ReceivedEmailEventData = EmailReceivedEvent["data"];

/**
 * One received message, normalised.
 *
 * Inbound mail reaches us by TWO routes with different payload shapes — the
 * `email.received` webhook and `emails.receiving.list()` (the reconcile sweep) —
 * and both must produce identical rows. Normalising into one type up front means
 * the compiler checks both adapters, instead of a cast papering over the
 * differences (an earlier version cast the list shape through `unknown` and
 * silently discarded attachment metadata, which the list DOES carry).
 */
export type InboundEmailInput = {
  emailId: string;
  createdAt: string;
  from: string;
  to: string[];
  cc: string[];
  receivedFor: string[];
  messageId: string;
  subject: string | null;
  attachments: {
    id: string;
    filename: string | null;
    contentType: string | null;
    contentDisposition: string | null;
    contentId: string | null;
    size: number | null;
  }[];
};

/** Adapter: the `email.received` webhook payload (metadata only, no sizes). */
export function fromWebhookEvent(data: ReceivedEmailEventData): InboundEmailInput {
  return {
    emailId: data.email_id,
    createdAt: data.created_at,
    from: data.from,
    to: data.to ?? [],
    cc: data.cc ?? [],
    receivedFor: data.received_for ?? [],
    messageId: data.message_id,
    subject: data.subject ?? null,
    attachments: (data.attachments ?? []).map((a) => ({
      id: a.id,
      filename: a.filename,
      contentType: a.content_type,
      contentDisposition: a.content_disposition,
      contentId: a.content_id,
      size: null,
    })),
  };
}

/** Adapter: a row from `emails.receiving.list()` (carries attachment sizes). */
export function fromListRow(row: ListReceivingEmail): InboundEmailInput {
  return {
    emailId: row.id,
    createdAt: row.created_at,
    from: row.from,
    to: row.to ?? [],
    cc: row.cc ?? [],
    receivedFor: row.received_for ?? [],
    messageId: row.message_id,
    subject: row.subject ?? null,
    attachments: (row.attachments ?? []).map((a) => ({
      id: a.id,
      filename: a.filename,
      contentType: a.content_type,
      contentDisposition: a.content_disposition,
      contentId: a.content_id,
      size: a.size,
    })),
  };
}

/**
 * Inbound mail — forwarding to a human mailbox.
 *
 * `selectauto.bg`'s apex MX points at Resend's receiving endpoint
 * (`inbound-smtp.eu-west-1.amazonaws.com`), so every message sent to ANY address
 * at the domain is accepted by Resend. `info@selectauto.bg` is the site's public
 * contact address (`CONTACT.email`), but Resend receiving offers no IMAP/POP —
 * there is no mailbox, and until this route existed nothing consumed the mail at
 * all. This module hands it to a real inbox so a human can read it.
 *
 * This is deliberately the SMALLEST thing that restores visibility: no DB, no
 * threads, no reply UI. The admin inbox + „отговори като info@" composer is the
 * next phase (see docs/admin-mail-and-deindex-plan.md §2.5–2.6); this keeps mail
 * flowing to a person while that gets built, and stays useful afterwards as a
 * belt-and-braces copy.
 *
 * TWO LIMITS TO KNOW:
 *  1. **Replying from the forwarded copy does not reach the customer.** The
 *     forward is re-sent from our own domain, so a reply in the destination inbox
 *     goes back to `info@` (i.e. to Resend, i.e. back here) rather than to the
 *     original sender. Until the admin composer ships, replies must be started as
 *     a NEW message to the sender's address.
 *  2. **Every forward is an outbound send.** Resend counts inbound AND outbound
 *     against the same quota, so each forwarded message costs 2 (one receive, one
 *     send). That is the price of visibility; the address allowlist below is what
 *     keeps the wide-open catch-all from turning spam into quota exhaustion.
 */

/** Destination mailbox for forwarded business mail. Unset ⇒ forwarding is off. */
const FORWARD_TO = process.env.MAIL_FORWARD_TO?.trim();

/**
 * Envelope sender for the forwarded copy. Must be on the Resend-verified domain
 * (`selectauto.bg` is verified in eu-west-1, so any address at it works with no
 * extra configuration). Deliberately NOT the `noreply@` used by `lib/email.ts` —
 * keeping the transactional sender's reputation separate from the mail relay.
 */
const FORWARD_FROM = process.env.MAIL_FORWARD_FROM?.trim() || "SelectAuto <info@selectauto.bg>";

/**
 * Which recipient addresses are worth forwarding. The MX is a CATCH-ALL — Resend
 * accepts mail for every address at the domain, including typos, role addresses
 * nobody published, and spam-harvested targets — so without this filter the
 * destination inbox becomes a spam trap and the shared quota drains.
 *
 * Comma-separated; matching is case-insensitive on the bare address. Opting into
 * the catch-all requires the explicit sentinel `*` — an UNSET **or EMPTY** value
 * falls back to the safe default. That distinction matters: `MAIL_FORWARD_ADDRESSES=`
 * with no value (trivially easy to produce by copying `.env.example`, or by
 * clearing the field in Vercel's UI) reaches the app as an empty string rather
 * than `undefined`, so a `??` default would silently relay the entire catch-all.
 */
const FORWARD_ADDRESSES_RAW = process.env.MAIL_FORWARD_ADDRESSES?.trim();

/** True only for the explicit `*` opt-in — never for a blank value. */
const FORWARD_ALL = FORWARD_ADDRESSES_RAW === "*";

const FORWARD_ADDRESSES = (FORWARD_ADDRESSES_RAW || "info@selectauto.bg")
  .split(",")
  .map((entry) => entry.trim().toLowerCase())
  .filter(Boolean);

/** `"Име <a@b.bg>"` / `"a@b.bg"` → `"a@b.bg"` (lower-cased). */
export function bareAddress(value: string): string {
  const angled = value.match(/<([^>]+)>/);
  return (angled ? angled[1] : value).trim().toLowerCase();
}

/** `"Име <a@b.bg>"` → `"Име"`; a bare address has no display name. */
export function displayName(value: string): string | null {
  const m = value.match(/^\s*"?([^"<]*?)"?\s*</);
  const name = m?.[1]?.trim();
  return name ? name : null;
}

/**
 * Reply/forward prefixes, including the Bulgarian ones a local correspondent's
 * client will add ("Отг:", "Препр:"), and the numbered `Re[2]:` form.
 */
const SUBJECT_PREFIX_RE = /^\s*(?:(?:re|rе|fwd|fw|отг|отговор|препр)\s*(?:\[\d+\])?\s*:\s*)+/i;

/**
 * Subject reduced to its threading key — prefixes stripped, whitespace collapsed,
 * lower-cased.
 *
 * Why threading keys on the subject at all: Resend's `email.received` webhook
 * carries METADATA ONLY, so `In-Reply-To` and `References` are simply not
 * available at ingest time (they arrive later with the body). Grouping by
 * participant + normalized subject is what an inbox can actually do on the
 * information it has, and it is what most simple mail UIs do anyway. The
 * `message_id` that IS in the payload still feeds the thread's References chain,
 * so OUTBOUND replies thread correctly in Gmail/Outlook regardless.
 */
export function subjectKey(subject: string | null | undefined): string {
  return (subject ?? "")
    .replace(SUBJECT_PREFIX_RE, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

/** True when forwarding is configured at all (`MAIL_FORWARD_TO` is set). */
export function isForwardingEnabled(): boolean {
  return Boolean(FORWARD_TO);
}

/**
 * Whether this received message should be forwarded.
 *
 * `received_for` is the address Resend actually accepted delivery FOR, which is
 * the reliable signal; `to`/`cc` are the header values and are checked too so a
 * message that reached us via an alias still matches.
 */
export function shouldForward(data: InboundEmailInput): boolean {
  if (FORWARD_ALL) return true;
  const recipients = [...data.receivedFor, ...data.to, ...data.cc].map(bareAddress);
  return recipients.some((recipient) => FORWARD_ADDRESSES.includes(recipient));
}

/**
 * Senders whose mail is forwarded but NOT filed as a conversation.
 *
 * `lib/email.ts` sends every lead notification FROM `noreply@selectauto.bg` TO
 * `info@selectauto.bg` — and since the apex MX is Resend receiving, each one
 * comes straight back to us as "inbound". Measured on the first real reconcile:
 * 60 of 78 stored messages were our own robots talking to themselves.
 *
 * Those are not conversations. The underlying leads already have dedicated
 * inboxes (/admin/carfax, /admin/zapitvaniya, /admin/oferti), so filing them
 * here would bury real customer mail under duplicate rows. They are still
 * FORWARDED, because as a "new lead" alert in a human mailbox they are useful.
 */
const NON_CONVERSATION_SENDERS = (process.env.MAIL_IGNORE_SENDERS ?? "noreply@selectauto.bg")
  .split(",")
  .map((entry) => entry.trim().toLowerCase())
  .filter(Boolean);

/** True when this message is our own automated mail rather than a correspondent. */
export function isOwnNotification(data: InboundEmailInput): boolean {
  return NON_CONVERSATION_SENDERS.includes(bareAddress(data.from));
}

/**
 * Forward one received message to the destination mailbox, reproducing the
 * original (`passthrough: true` — Resend fetches the body and attachments itself,
 * so we never download multi-MB payloads into a serverless function).
 *
 * Idempotent: webhook delivery is at-least-once and Resend retries on 5xx, so the
 * `email_id`-derived idempotency key means a redelivered event cannot send the
 * same message twice (Resend honours the key for 24h — comfortably longer than
 * its 5s→10h retry schedule reaches for a transient failure).
 *
 * Throws on failure so the route can answer 5xx and let Resend retry.
 */
export async function forwardInboundEmail(emailId: string): Promise<string> {
  if (!FORWARD_TO) {
    throw new Error("MAIL_FORWARD_TO is not set");
  }

  const response = await getResend().emails.receiving.forward(
    {
      emailId,
      to: FORWARD_TO,
      from: FORWARD_FROM,
      passthrough: true,
    },
    { idempotencyKey: `inbound-forward-${emailId}` },
  );

  if (response.error) {
    throw new Error(`Resend forward failed (${response.error.name}): ${response.error.message}`);
  }

  return response.data.id;
}
