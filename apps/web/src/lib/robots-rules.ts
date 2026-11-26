import type { MetadataRoute } from "next";

/**
 * The robots.txt groups (app/robots.ts explains the policy). Kept here, free of `@/` imports, so tests/robots can load
 * it directly.
 */

/**
 * Bulk AI crawlers (training / AI-search indexes): everything except the car pages. Tokens as each vendor
 * documents them (checked 2026-11-26: platform.openai.com/docs/bots, support.claude.com „Does Anthropic crawl data
 * from the web", docs.perplexity.ai/guides/bots, developer.amazon.com/amazonbot, Meta's web-crawlers page).
 */
export const AI_CRAWLERS = [
  "GPTBot", // OpenAI training
  "OAI-SearchBot", // OpenAI search
  "ClaudeBot", // Anthropic training/crawl
  "Claude-SearchBot", // Anthropic search
  "anthropic-ai", // legacy Anthropic UA
  "PerplexityBot", // Perplexity index
  "Google-Extended", // Gemini / Vertex training (separate from Googlebot)
  "Applebot-Extended", // Apple Intelligence training
  "CCBot", // Common Crawl (feeds many LLMs)
  "Amazonbot", // Amazon (Alexa / AI)
  "meta-externalagent", // Meta AI training
];

/** User-triggered AI fetchers (a person asked about the page): everything, car pages included. */
export const AI_USER_FETCHERS = [
  "ChatGPT-User", // ChatGPT browsing on a user's behalf
  "Claude-User", // Anthropic, a fetch a Claude user asked for
  "Claude-Web", // Anthropic user-facing fetch (older UA)
  "Perplexity-User", // Perplexity user fetch
];

/** The car pages and the filtered catalog URLs — kept from the bulk AI crawlers (see app/robots.ts). */
export const AI_CRAWLER_DISALLOW = ["/avtomobil/", "/vsichki-avtomobili?"];

// Auth/account + private surfaces (also noindex per-page), for everyone. Auth routes per the Auth.js v5 migration:
// /sign-in, /registratsiya, /verify, /zabravena-parola, /nova-parola. /api/auth is the NextAuth handler.
export const DISALLOW = [
  "/api/",
  "/admin", // owner back office (also noindex via admin/layout; proxy-gated)
  "/lyubimi",
  "/sign-in",
  "/registratsiya",
  "/verify",
  "/zabravena-parola",
  "/nova-parola",
];

/** The rule groups: search engines and everyone else (`*`), the bulk AI crawlers, the user-triggered fetchers. */
export function robotsRules(): MetadataRoute.Robots["rules"] {
  return [
    { userAgent: "*", allow: "/", disallow: DISALLOW },
    ...AI_CRAWLERS.map((userAgent) => ({ userAgent, allow: "/", disallow: [...DISALLOW, ...AI_CRAWLER_DISALLOW] })),
    ...AI_USER_FETCHERS.map((userAgent) => ({ userAgent, allow: "/", disallow: DISALLOW })),
  ];
}
