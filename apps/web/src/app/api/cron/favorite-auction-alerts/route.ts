import { NextResponse } from "next/server";
import { sendFavoriteAuctionDigest } from "@/lib/email";
import { markFavoriteAuctionAlertsSent } from "@/mutations/favorites";
import { getDueFavoriteAuctionAlerts } from "@/queries/favorites";

/**
 * Daily "любими автомобили с търг днес" digest — invoked by Vercel Cron (see the
 * `crons` entry in apps/web/vercel.json). For every opted-in user with a
 * favourite whose auction is today, it sends one digest email.
 *
 * Auth: Vercel automatically sends the project's `CRON_SECRET` as a Bearer
 * Authorization header when it invokes the cron path; we reject anything that
 * doesn't match (the route is otherwise a public URL). If `CRON_SECRET` isn't
 * configured we fail closed with 401 — the digest simply won't run until it's set.
 *
 * Idempotency: we CLAIM the due users first (stamp `favorite_auction_alert_sent_on`
 * = today's NY day) and only then send. Vercel cron delivery is best-effort and
 * can double-fire; claiming up front means a concurrent/duplicate invocation's
 * fresh query no longer sees these users, so nobody gets two emails. A per-user
 * send failure is logged and skipped (best-effort, like the app's other emails) —
 * there's no same-day retry either way, so claim-first never costs a recoverable
 * send.
 */
export const maxDuration = 60;

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const due = await getDueFavoriteAuctionAlerts();
  if (due.length === 0) {
    return NextResponse.json({ recipients: 0, sent: 0, failed: 0 });
  }

  // Claim all recipients up front (see the idempotency note above).
  await markFavoriteAuctionAlertsSent(due.map((r) => r.userId));

  let sent = 0;
  let failed = 0;
  for (const recipient of due) {
    try {
      await sendFavoriteAuctionDigest(recipient.email, {
        name: recipient.name ?? undefined,
        cars: recipient.cars,
      });
      sent += 1;
    } catch (error) {
      failed += 1;
      console.error("[cron/favorite-auction-alerts] send failed", recipient.userId, error);
    }
  }

  return NextResponse.json({ recipients: due.length, sent, failed });
}
