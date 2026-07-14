import { cacheLife, cacheTag } from "next/cache";

/**
 * Server-side fetch of the business's Google reviews via the **Places API (New)**
 * Place Details endpoint, for the /otzivi page.
 *
 * ── Why cached hard (daily) ──
 * The `reviews` field is billed on Google's most expensive Places SKU (Enterprise
 * + Atmosphere). `"use cache"` + `cacheLife("days")` means we pay ~1 call/day total
 * (shared across all visitors), not per request. Reviews change slowly, so daily is
 * plenty fresh.
 *
 * ── Constraints (verified against the 2026 docs) ──
 * - The API returns AT MOST 5 reviews per place (hard cap, no pagination) — fine
 *   for a testimonials section. `userRatingCount` still gives the TRUE total.
 * - `languageCode=bg` returns the Bulgarian originals (not Google's English
 *   translation), which is what a BG site should show.
 *
 * ── Env-gated + fail-open ──
 * Reads `GOOGLE_PLACES_API_KEY` + `GOOGLE_PLACES_ID` (server-only; never
 * `NEXT_PUBLIC_`, so the key can't reach the client). Returns `null` when either is
 * unset OR on any upstream error, so the page renders its graceful fallback until
 * the key is configured — then it goes live automatically with no code change.
 *
 * ── Schema note ──
 * These reviews are shown as CONTENT only. Per Google's (Dec 2025) self-serving
 * policy, a business marking up its OWN Google reviews with Review/AggregateRating
 * is ineligible for star rich results, so the /otzivi page emits NO review schema.
 */

export type GoogleReview = {
  author: string;
  authorUri: string | null;
  rating: number;
  text: string;
  relativeTime: string | null;
};

export type GoogleReviews = {
  rating: number | null;
  total: number | null;
  reviews: GoogleReview[];
};

type PlacesReview = {
  rating?: number;
  text?: { text?: string };
  originalText?: { text?: string };
  relativePublishTimeDescription?: string;
  authorAttribution?: { displayName?: string; uri?: string };
};
type PlacesResponse = {
  rating?: number;
  userRatingCount?: number;
  reviews?: PlacesReview[];
};

/**
 * Fetch + normalize the Google reviews, or `null` if unconfigured/unavailable.
 * Only the 5-review API cap's worth is returned. Text prefers the Bulgarian
 * original where present.
 */
export async function getGoogleReviews(): Promise<GoogleReviews | null> {
  "use cache";
  cacheTag("google-reviews");
  cacheLife("days");

  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  const placeId = process.env.GOOGLE_PLACES_ID;
  if (!apiKey || !placeId) return null;

  const url = `https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}?languageCode=bg`;

  try {
    const res = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": apiKey,
        // Only the three fields we render — keeps the request on exactly the
        // billed set and nothing more.
        "X-Goog-FieldMask": "rating,userRatingCount,reviews",
      },
    });
    if (!res.ok) {
      console.error(`[google-reviews] Places API HTTP ${res.status}`);
      return null;
    }

    const data = (await res.json()) as PlacesResponse;
    const reviews: GoogleReview[] = (data.reviews ?? [])
      .map((r): GoogleReview | null => {
        const text = (r.originalText?.text ?? r.text?.text ?? "").trim();
        const author = r.authorAttribution?.displayName?.trim() ?? "";
        if (!text || !author) return null; // rating-only reviews have no text to show
        return {
          author,
          authorUri: r.authorAttribution?.uri ?? null,
          rating: typeof r.rating === "number" ? r.rating : 0,
          text,
          relativeTime: r.relativePublishTimeDescription ?? null,
        };
      })
      .filter((r): r is GoogleReview => r !== null);

    return {
      rating: typeof data.rating === "number" ? data.rating : null,
      total: typeof data.userRatingCount === "number" ? data.userRatingCount : null,
      reviews,
    };
  } catch (error) {
    console.error("[google-reviews] fetch failed", error);
    return null;
  }
}
