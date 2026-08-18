import { NextResponse } from "next/server";
import { reconcileInboundMail } from "@/mutations/mail";

/**
 * Hourly safety net for the admin inbox — invoked by Vercel Cron (see the
 * `crons` entry in apps/web/vercel.json).
 *
 * Two jobs: re-ingest anything `/api/resend-inbound` never received (Resend
 * gives up after its retry ladder, and a deploy or a bad signing secret inside
 * that window would silently drop messages — which, with no mailbox behind
 * info@, means losing them outright), and pull bodies for messages nobody has
 * opened yet.
 *
 * Auth: the same CRON_SECRET Bearer pattern as the other crons — Vercel sends it
 * automatically, and the route fails closed with 401 if it isn't configured,
 * because this endpoint is otherwise a public URL that spends Resend quota.
 */
export const maxDuration = 60;

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    const result = await reconcileInboundMail();
    return NextResponse.json(result);
  } catch (error) {
    console.error("[cron/mail-reconcile] failed", error);
    return new NextResponse("Reconcile failed", { status: 500 });
  }
}
