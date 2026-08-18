import { NextResponse } from "next/server";
import { getIndexNowKey } from "@/lib/indexnow";

/**
 * IndexNow ownership proof.
 *
 * The protocol verifies that whoever submits URLs controls the host, by fetching
 * a UTF-8 text file at the site root whose name is the key and whose body is the
 * key. We serve it from a route rather than `public/` so the key stays an env
 * var — committing it to the repo would publish it, and a leaked key lets anyone
 * submit URLs on our behalf.
 *
 * The canonical `/{key}.txt` path is produced by a rewrite in next.config.ts,
 * which points at this handler. 404s when no key is configured, which is also
 * what `submitIndexNow` checks before bothering to submit.
 */
export async function GET() {
  const key = getIndexNowKey();
  if (!key) {
    return new NextResponse("Not found", { status: 404 });
  }
  return new NextResponse(key, {
    status: 200,
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "cache-control": "public, max-age=3600",
    },
  });
}
