import type { CalcConfig } from "@/data/import-rates";
import { getCalcConfig } from "@/queries/tariffs";
import { NextResponse } from "next/server";

/**
 * The active calculator config as JSON for the estimator's client island. Tiny
 * (~1KB) so it's fetched on every calculator mount; the client uses the built-in
 * defaults until it arrives. A static prerender the CDN serves (tag `calcConfig`,
 * expired on admin save).
 *
 * Leaves out the mobile.bg markup — the retail margin on our own adverts, which
 * the estimator never reads. No browser caching: a kept copy (it was 5 minutes)
 * went on showing the old fees after a save.
 */
export async function GET() {
  const config: Partial<CalcConfig> = { ...(await getCalcConfig()) };
  delete config.mobilebgMarkupPct;
  return NextResponse.json(config, {
    headers: { "Cache-Control": "public, max-age=0, must-revalidate" },
  });
}
