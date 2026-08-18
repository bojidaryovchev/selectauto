import { getResend } from "@/lib/email";
import { fromListRow, isOwnNotification, shouldForward } from "@/lib/inbound-mail";
import { fetchPendingMessageBodies } from "./fetch-message-body.mutation";
import { ingestInboundEmail } from "./ingest-inbound-email.mutation";

/**
 * Backfill anything the webhook missed, and pull bodies nobody opened.
 *
 * The webhook is at-least-once, not exactly-once: Resend gives up after its
 * retry ladder (5s → 5m → 30m → 2h → 5h → 10h), and a deploy, an outage or a
 * mis-set signing secret during that window silently drops messages. Because
 * `info@` has no mailbox, a dropped message is simply lost to the business —
 * so a reconcile pass is not optional hygiene, it is the safety net.
 *
 * This is cheap and safe to re-run: Resend keeps received mail server-side
 * ("Even if your webhook endpoint is down, you can still see your emails in the
 * dashboard and retrieve them using the Receiving API"), and
 * `ingestInboundEmail` is idempotent on the Resend email id.
 *
 * Called only by the cron route, which gates on CRON_SECRET.
 */

/** How many recent received emails to examine per run. */
const RECONCILE_PAGE = 100;

export type ReconcileResult = {
  listed: number;
  skipped: number;
  inserted: number;
  duplicates: number;
  failed: number;
  bodies: { attempted: number; fetched: number };
};

export async function reconcileInboundMail(): Promise<ReconcileResult> {
  const result: ReconcileResult = {
    listed: 0,
    skipped: 0,
    inserted: 0,
    duplicates: 0,
    failed: 0,
    bodies: { attempted: 0, fetched: 0 },
  };

  const response = await getResend().emails.receiving.list({ limit: RECONCILE_PAGE });
  if (response.error || !response.data) {
    throw new Error(`Resend receiving.list failed: ${response.error?.message ?? "no data"}`);
  }

  const emails = response.data.data ?? [];
  result.listed = emails.length;

  for (const email of emails) {
    // Same normalised shape the webhook produces — the list row is fully typed
    // and even carries attachment SIZES, which the webhook payload does not.
    const data = fromListRow(email);

    // Same two filters the webhook applies: not-our-address, and our own robot
    // notifications (noreply@ → info@), which are not conversations.
    if (!shouldForward(data) || isOwnNotification(data)) {
      result.skipped += 1;
      continue;
    }

    try {
      const ingested = await ingestInboundEmail(data);
      if (ingested.status === "inserted") result.inserted += 1;
      else result.duplicates += 1;
    } catch (error) {
      result.failed += 1;
      console.error("[mail-reconcile] ingest failed", email.id, error);
    }
  }

  result.bodies = await fetchPendingMessageBodies();

  return result;
}
