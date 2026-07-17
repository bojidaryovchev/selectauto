import type { MetadataRoute } from "next";
import { SITE_URL } from "@/constants";
import { getSitemapChunkCursors } from "@/queries/sitemap";

/**
 * robots.txt (generated). Strategy (see docs/12-web-seo-strategy.md §6 — GEO is an
 * uncontested win here: one competitor blocks AI crawlers, another ships empty
 * titles):
 *
 * - **Explicitly ALLOW the major AI crawlers** (GPTBot, ClaudeBot, PerplexityBot,
 *   Google-Extended, …). A bare `User-agent: *: Allow: /` already permits them,
 *   but naming them documents intent and survives any future tightening of the
 *   wildcard rule. We WANT to be cited in AI Overviews / ChatGPT / Perplexity.
 * - **Disallow private / non-indexable surfaces**: the favourites list and the
 *   auth/account pages (sign-in, registration, password reset, email verify —
 *   all also `noindex` at the page level; robots + meta is belt & suspenders).
 *   `/api/` is internal. The `?status=past` sold-lots view is deliberately NOT
 *   disallowed here: it relies on its page-level `noindex, follow`, and a robots
 *   Disallow would block crawling so Google could never read that meta — the two
 *   mechanisms are mutually defeating (a disallowed-but-linked URL can still be
 *   indexed url-only, and the `follow` equity would be lost).
 * - Point crawlers at the sitemaps: the static-pages `/sitemap.xml`, the make/model
 *   hub sitemap (`/avtomobili/marka/sitemap.xml`), PLUS each listing chunk
 *   (`/avtomobil/sitemap/{id}.xml`). Next 16 does not auto-generate
 *   a `<sitemapindex>` for `generateSitemaps` (verified in
 *   next-metadata-route-loader), so we enumerate the chunk URLs here. The chunk
 *   count comes from the same cached cursor helper the sitemap uses (one source
 *   of truth); if the DB is unavailable we fail closed to just the static
 *   sitemap so robots still emits.
 *
 * Async (reads the cached chunk count) but uses no request-time API, so it's
 * still build-emitted. Keep the disallow set in sync with the page-level `robots`
 * directives in the route files.
 */

const AI_CRAWLERS = [
  "GPTBot", // OpenAI training
  "OAI-SearchBot", // OpenAI search
  "ChatGPT-User", // ChatGPT browsing on a user's behalf
  "ClaudeBot", // Anthropic training/crawl
  "Claude-Web", // Anthropic user-facing fetch
  "anthropic-ai", // legacy Anthropic UA
  "PerplexityBot", // Perplexity index
  "Perplexity-User", // Perplexity user fetch
  "Google-Extended", // Gemini / Vertex training (separate from Googlebot)
  "Applebot-Extended", // Apple Intelligence training
  "CCBot", // Common Crawl (feeds many LLMs)
];

// Auth/account + private surfaces (also noindex per-page). Auth routes per the
// Auth.js v5 migration: /sign-in, /registratsiya, /verify, /zabravena-parola,
// /nova-parola. /api/auth is the NextAuth handler.
const DISALLOW = [
  "/api/",
  "/admin", // owner back office (also noindex via admin/layout; proxy-gated)
  "/lyubimi",
  "/sign-in",
  "/registratsiya",
  "/verify",
  "/zabravena-parola",
  "/nova-parola",
];

export default async function robots(): Promise<MetadataRoute.Robots> {
  const chunkCount = (await getSitemapChunkCursors()).length;
  const sitemaps = [
    `${SITE_URL}/sitemap.xml`,
    // Make/model SEO hubs (`/avtomobili/marka/{make}/{model}`) — one file, only the
    // indexable hubs (see app/avtomobili/marka/sitemap.ts).
    `${SITE_URL}/avtomobili/marka/sitemap.xml`,
    ...Array.from({ length: chunkCount }, (_, i) => `${SITE_URL}/avtomobil/sitemap/${i}.xml`),
  ];

  return {
    rules: [
      { userAgent: "*", allow: "/", disallow: DISALLOW },
      ...AI_CRAWLERS.map((userAgent) => ({ userAgent, allow: "/", disallow: DISALLOW })),
    ],
    sitemap: sitemaps,
    host: SITE_URL,
  };
}
