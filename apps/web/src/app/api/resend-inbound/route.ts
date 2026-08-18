import { NextResponse } from "next/server";
import { getResend } from "@/lib/email";
import {
  forwardInboundEmail,
  fromWebhookEvent,
  isForwardingEnabled,
  isOwnNotification,
  shouldForward,
} from "@/lib/inbound-mail";
import { ingestInboundEmail } from "@/mutations/mail";

/**
 * Resend webhook endpoint — currently handles `email.received` only.
 *
 * Mail to any `@selectauto.bg` address is accepted by Resend (the apex MX points
 * at its receiving endpoint) and announced here. Phase 0 forwards it to a real
 * mailbox so a human can read it; see `lib/inbound-mail.ts` for why, and
 * docs/admin-mail-and-deindex-plan.md for the admin-inbox phase that follows.
 *
 * AUTH: the Svix/Standard-Webhooks SIGNATURE is the only gate. The proxy does not
 * force-protect `/api` (only `/admin`), and there is no session on a vendor
 * callback — so an unverifiable request must be rejected here. Resend's payload is
 * HMAC-signed over the RAW body, which is why this reads `request.text()` and
 * never `request.json()`: any re-serialisation changes the bytes and the signature
 * fails. `webhooks.verify()` is SYNCHRONOUS and THROWS on a bad signature (it is
 * backed by the `standardwebhooks` package the Resend SDK already bundles — svix
 * is NOT a dependency and must not be installed).
 *
 * STATUS CODES matter here, because they drive Resend's retry schedule
 * (5s → 5m → 30m → 2h → 5h → 10h):
 *   - 400 — bad/missing signature. Terminal; retrying cannot help.
 *   - 200 — accepted, including events we deliberately ignore. Anything else
 *     would make Resend retry an event we will never act on.
 *   - 500 — the forward itself failed (Resend API down, rate-limited). We WANT
 *     the retry, and `forwardInboundEmail`'s idempotency key makes it safe.
 */
export async function POST(request: Request) {
  const webhookSecret = process.env.RESEND_WEBHOOK_SECRET;
  if (!webhookSecret) {
    // Fail closed: without the secret nothing can be verified, and an unverified
    // payload must never be acted on. 503 (not 500) so a retry succeeds once the
    // env var is set, rather than burning the retry budget on a config error.
    console.error("[resend-inbound] RESEND_WEBHOOK_SECRET is not set — rejecting");
    return new NextResponse("Webhook not configured", { status: 503 });
  }

  // RAW body — see the signature note above.
  const payload = await request.text();
  const id = request.headers.get("svix-id");
  const timestamp = request.headers.get("svix-timestamp");
  const signature = request.headers.get("svix-signature");

  if (!id || !timestamp || !signature) {
    return new NextResponse("Missing signature headers", { status: 400 });
  }

  let event;
  try {
    event = getResend().webhooks.verify({
      payload,
      headers: { id, timestamp, signature },
      webhookSecret,
    });
  } catch (error) {
    console.error("[resend-inbound] signature verification failed", error);
    return new NextResponse("Invalid signature", { status: 400 });
  }

  // The endpoint may be subscribed to more event types later (bounces and
  // complaints are the obvious next ones, once replies are sent from the panel).
  // Anything we don't handle is acknowledged, not retried.
  if (event.type !== "email.received") {
    return NextResponse.json({ ok: true, ignored: event.type });
  }

  const inbound = fromWebhookEvent(event.data);

  // The domain is a catch-all; only the addresses we actually publish are worth
  // storing or relaying (and paying quota for).
  if (!shouldForward(inbound)) {
    return NextResponse.json({ ok: true, skipped: "recipient not forwarded" });
  }

  // Our own lead notifications (noreply@ → info@) come back through the MX as
  // "inbound". They are forwarded — a new-lead alert in a human mailbox is
  // useful — but never filed as a conversation, or the real customer mail would
  // be buried under them (measured: 60 of the first 78 stored messages).
  const ownNotification = isOwnNotification(inbound);

  // PERSIST FIRST, and let a failure here 500. The admin inbox is the durable
  // record — there is no mailbox behind info@ — so losing the row loses the
  // message, whereas losing the forwarded copy only costs a notification.
  // `ingestInboundEmail` is idempotent on the Resend email id, so the retry that
  // a 500 provokes cannot duplicate the message.
  let ingested = null;
  if (!ownNotification) {
    try {
      ingested = await ingestInboundEmail(inbound);
    } catch (error) {
      console.error("[resend-inbound] ingest failed", inbound.emailId, error);
      return new NextResponse("Ingest failed", { status: 500 });
    }
  }

  // Belt-and-braces copy to a human mailbox. Best-effort ON PURPOSE, and only on
  // first ingest: the message is already safely stored, so a forwarding failure
  // must not provoke a retry that re-forwards, and a redelivered webhook must
  // not send the copy twice.
  let forwarded: string | null = null;
  if (isForwardingEnabled() && (ownNotification || ingested?.status === "inserted")) {
    try {
      forwarded = await forwardInboundEmail(inbound.emailId);
    } catch (error) {
      console.error("[resend-inbound] forward failed (message is stored)", inbound.emailId, error);
    }
  }

  return NextResponse.json({
    ok: true,
    status: ownNotification ? "own-notification" : ingested?.status,
    threadId: ingested?.threadId ?? null,
    forwarded,
  });
}
