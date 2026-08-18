import { SITE_URL } from "@/constants";

/**
 * IndexNow — instant "this URL changed//was deleted" notification.
 *
 * Worth wiring for a PAID de-index because it is the one submission channel that
 * is genuinely automatable and explicitly covers deletions: IndexNow's own FAQ
 * answers "Can I submit redirected or deleted URLs?" with "Yes. You should
 * submit redirected URLs and pages that return HTTP 404 or HTTP 410 status
 * codes." Our de-indexed URLs return a real 410 from the proxy, so they qualify.
 *
 * ⚠️ GOOGLE DOES NOT PARTICIPATE. IndexNow's endpoint list is Bing, Naver,
 * Seznam, Yandex, Yep and Amazon — Google is absent, and Google has no URL
 * removal API of any kind (the Search Console API has no removals resource, and
 * the Indexing API is restricted to JobPosting/BroadcastEvent). So this must
 * never be presented to a customer as "removed from Google": the Google half
 * stays a manual Search Console request. The admin UI says so.
 *
 * A 200 means "received", not "actioned": "The HTTP 200 response code only
 * indicates that the search engine has received your URL."
 *
 * Ownership is proved by hosting `{key}.txt` at the site root — see
 * `app/[key]/route.ts`-style static route in `app/indexnow-key.txt/route.ts`.
 * Without INDEXNOW_KEY set, submission is skipped rather than failing the
 * de-index: the site-side suppression is what the customer actually bought.
 */

const ENDPOINT = "https://api.indexnow.org/indexnow";

/** Max URLs per POST per the spec. */
const MAX_URLS = 10_000;

export type IndexNowOutcome = "submitted" | "skipped" | "failed";

export function getIndexNowKey(): string | null {
  const key = process.env.INDEXNOW_KEY?.trim();
  // The spec requires 8-128 hex characters.
  if (!key || !/^[a-f0-9]{8,128}$/i.test(key)) return null;
  return key;
}

export async function submitIndexNow(urls: string[]): Promise<IndexNowOutcome> {
  const key = getIndexNowKey();
  if (!key || urls.length === 0) return "skipped";

  const host = new URL(SITE_URL).host;

  try {
    const response = await fetch(ENDPOINT, {
      method: "POST",
      headers: { "content-type": "application/json; charset=utf-8" },
      body: JSON.stringify({
        host,
        key,
        keyLocation: `${SITE_URL}/${key}.txt`,
        urlList: urls.slice(0, MAX_URLS),
      }),
    });

    if (!response.ok) {
      // 429 = rate limited / suspected spam; anything else is a real failure.
      console.error("[indexnow] submission rejected", response.status, await response.text().catch(() => ""));
      return "failed";
    }
    return "submitted";
  } catch (error) {
    console.error("[indexnow] submission threw", error);
    return "failed";
  }
}
