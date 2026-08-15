import type { EmailReceivedEvent } from "resend";
import { getResend } from "@/lib/email";

/**
 * The `email.received` payload. Derived from the event rather than imported
 * directly: the SDK declares `ReceivedEmailEventData` internally but does not
 * export it, while `EmailReceivedEvent` is public (resend 6.17.2).
 */
type ReceivedEmailEventData = EmailReceivedEvent["data"];

/**
 * Inbound mail — phase 0: FORWARD ONLY.
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
function bareAddress(value: string): string {
  const angled = value.match(/<([^>]+)>/);
  return (angled ? angled[1] : value).trim().toLowerCase();
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
export function shouldForward(data: ReceivedEmailEventData): boolean {
  if (FORWARD_ALL) return true;
  const recipients = [...data.received_for, ...data.to, ...data.cc].map(bareAddress);
  return recipients.some((recipient) => FORWARD_ADDRESSES.includes(recipient));
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
export async function forwardInboundEmail(data: ReceivedEmailEventData): Promise<string> {
  if (!FORWARD_TO) {
    throw new Error("MAIL_FORWARD_TO is not set");
  }

  const response = await getResend().emails.receiving.forward(
    {
      emailId: data.email_id,
      to: FORWARD_TO,
      from: FORWARD_FROM,
      passthrough: true,
    },
    { idempotencyKey: `inbound-forward-${data.email_id}` },
  );

  if (response.error) {
    throw new Error(`Resend forward failed (${response.error.name}): ${response.error.message}`);
  }

  return response.data.id;
}
