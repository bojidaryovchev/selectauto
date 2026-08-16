import type { MetadataRoute } from "next";
import { SITE_URL } from "@/constants";

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
 * - Point crawlers at the sitemaps: the static-pages `/sitemap.xml` and the
 *   make/model hub sitemap (`/avtomobili/marka/sitemap.xml`).
 *
 * ── Why the ~945k listing URLs are NOT advertised here (2026-08-16) ──────────
 * This used to also enumerate 19 chunk sitemaps (`/avtomobil/sitemap/{i}.xml`,
 * 50k URLs each) covering every active car. Measured against Google, that corpus
 * earned essentially nothing while consuming essentially all of the crawl:
 *
 *   route                                pages    ranking kws   est. visits/mo
 *   /avtomobili/marka/{make}/{model}     ~1,286        54            24.6
 *   /vsichki-avtomobili                       1        10             3.8
 *   /avtomobil/{id}                     945,000         1             0.4
 *
 * (Whole domain: 85 ranking keywords, ~74 organic visits/month.) Meanwhile the
 * site was serving ~700k crawler requests/day — ~99% of all traffic — at ~$330/mo
 * of Vercel usage, almost entirely that long tail. So we stopped ADVERTISING it:
 * detail pages remain live, crawlable and indexable through the catalog and hub
 * links, they are simply no longer pushed into Google's discovery queue. This is
 * the same crawl-budget/index-bloat doctrine docs/11 §1 already applies to sold
 * lots, extended to the active tail. The hubs are the durable ranking asset and
 * keep their sitemap.
 *
 * If a curated listing sitemap is ever wanted (a few thousand priced, photographed
 * cars in the makes that actually rank — NOT all 945k), the keyset chunking query
 * is still in `queries/sitemap/get-listing-sitemap.query.ts`, and the route that
 * used it is in git history at `app/avtomobil/sitemap.ts`.
 *
 * Sync + DB-free: this reads nothing at all now, so robots.txt can never be
 * degraded by a database hiccup. Keep the disallow set in sync with the page-level
 * `robots` directives in the route files.
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

export default function robots(): MetadataRoute.Robots {
  const sitemaps = [
    `${SITE_URL}/sitemap.xml`,
    // Make/model SEO hubs (`/avtomobili/marka/{make}/{model}`) — one file, only the
    // indexable hubs (see app/avtomobili/marka/sitemap.ts).
    `${SITE_URL}/avtomobili/marka/sitemap.xml`,
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
