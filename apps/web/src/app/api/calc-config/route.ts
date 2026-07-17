import { NextResponse } from "next/server";
import { getCalcConfig } from "@/queries/tariffs";

/**
 * The active calculator config as JSON for the estimator's client island. Tiny
 * (~1KB) so it's fetched on every calculator mount; the client uses the built-in
 * defaults until it arrives. Cached (tag `calcConfig`, revalidated on admin save).
 */
export async function GET() {
  const config = await getCalcConfig();
  return NextResponse.json(config, {
    headers: { "Cache-Control": "public, max-age=300, stale-while-revalidate=86400" },
  });
}
