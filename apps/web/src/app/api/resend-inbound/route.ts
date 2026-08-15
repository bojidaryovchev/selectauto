import { NextResponse } from "next/server";
import { getResend } from "@/lib/email";
import { forwardInboundEmail, isForwardingEnabled, shouldForward } from "@/lib/inbound-mail";

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

  if (!isForwardingEnabled()) {
    console.warn("[resend-inbound] MAIL_FORWARD_TO is not set — received mail is not being forwarded");
    return NextResponse.json({ ok: true, skipped: "forwarding disabled" });
  }

  // The domain is a catch-all; only the addresses we actually publish are worth
  // relaying (and paying quota for).
  if (!shouldForward(event.data)) {
    return NextResponse.json({ ok: true, skipped: "recipient not forwarded" });
  }

  try {
    const forwardedId = await forwardInboundEmail(event.data);
    return NextResponse.json({ ok: true, forwarded: forwardedId });
  } catch (error) {
    // 500 → Resend retries; the idempotency key stops a double send.
    console.error("[resend-inbound] forward failed", event.data.email_id, error);
    return new NextResponse("Forward failed", { status: 500 });
  }
}
