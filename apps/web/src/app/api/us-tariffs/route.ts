import { NextResponse } from "next/server";
import { getUsTariffs } from "@/queries/tariffs";

/**
 * The active US/Canada transport tariffs as JSON, for the import calculator's
 * client island. The estimator fetches this LAZILY — only when the US market is
 * first selected — so Korea/Canada views and non-US car pages never download the
 * ~600-row table. The data is `"use cache"` (tag `usTariffs`, revalidated on
 * admin upload); this route is a thin JSON transport over that cached read.
 */
export async function GET() {
  const tariffs = await getUsTariffs();
  return NextResponse.json(tariffs, {
    headers: { "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400" },
  });
}
