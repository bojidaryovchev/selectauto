import { getUsTariffs } from "@/queries/tariffs";
import { NextResponse } from "next/server";

/**
 * The active US/Canada transport tariffs as JSON, for the import calculator's
 * client island. The estimator fetches this LAZILY — only when the US market is
 * first selected — so Korea/Canada views and non-US car pages never download the
 * ~600-row table. The data is `"use cache"` (tag `usTariffs`, expired on admin
 * upload/activation); this route is a thin JSON transport over that cached read,
 * prerendered and served by the CDN. No browser caching: a kept copy (it was an
 * hour) went on pricing transport from the old table after an upload.
 */
export async function GET() {
  const tariffs = await getUsTariffs();
  return NextResponse.json(tariffs, {
    headers: { "Cache-Control": "public, max-age=0, must-revalidate" },
  });
}
