# 11 — Website SEO & Indexing

How the `apps/web` site is made discoverable: what gets indexed, what deliberately
does **not**, the durable ranking assets (brand/model hubs), structured data, and
the AI-crawler (GEO) posture. This is the **technical-SEO as-built**; the market
research / competitor / keyword strategy lives in [`12-web-seo-strategy.md`](12-web-seo-strategy.md).

## 1. The posture (one rule)

**Index every *active* car; keep *sold/concluded* cars out of the index.**

- **Active** listings are the programmatic-SEO moat (~945k live cars feeding
  long-tail `{make} {model} внос от {държава}` queries) — each gets its own
  indexable URL.
- **Sold** lots are transient, thin, decaying content. Keeping every car ever
  listed indexed (the legacy WordPress behaviour — Yoast auto-generated a sitemap
  entry per `car` post and never pruned, leaving **391 car-sitemaps** / ~300k
  soft-404s in Google) is **index bloat**: it burns crawl budget on dead pages and
  dilutes site-wide quality signals. We do the opposite.

Best-practice backing (large transient/auction inventory): prune expired URLs,
segment sitemaps by type/freshness, `noindex` pages that shouldn't exist in search,
`canonical` for duplicates, protect crawl budget. Refs: [Search Engine Land —
Indexability](https://searchengineland.com/guide/indexability), [ClickRank — Index
Bloat](https://www.clickrank.ai/index-bloat/), [Google Crawl
Budget](https://developers.google.com/crawling/docs/crawl-budget).

## 2. The URL map (what is / isn't indexable)

| Surface | Route | Indexable? | Mechanism |
|---|---|---|---|
| Active car detail | `/avtomobil/[id]` | ✅ yes | title/description + `alternates.canonical` + OG; `robots` left default |
| **Sold** car detail | `/avtomobil/[id]` | ❌ `noindex,follow` → **410** when long-dead | page-level `robots` (§3) + `proxy.ts` 410 (§3) |
| Brand hub | `/avtomobili/marka/{make}` | ✅ (≥3 live listings) | §4 |
| Model hub | `/avtomobili/marka/{make}/{model}` | ✅ (≥3 live listings) | §4 |
| Active catalog | `/vsichki-avtomobili` | ✅ (first page SSR) | §5 |
| **Past** catalog | `/vsichki-avtomobili?status=past` | ❌ `noindex,follow` | `generateMetadata` + `robots.ts` disallow |
| Faceted filters | `/vsichki-avtomobili?brand=…` | canonicalized | canonical → bare `/vsichki-avtomobili` (no faceted-URL bloat) |
| Invalid car id | `/avtomobil/[bad]` | ❌ noindex | `notFound()` injects `noindex` even though PPR returns HTTP 200 |
| Auth / favourites / `/api/` | — | ❌ | page `noindex` + `robots.ts` disallow (§5) |

## 3. Sold-lot lifecycle: `noindex` → `410 Gone`

A just-sold lot is kept **`noindex, follow`** (drops out of the index while `follow`
still passes link equity from a still-fresh page). But `noindex` at ~160k+ sold rows
has a cost — Google must re-crawl each page to re-see the tag — so **long-dead lots
escalate to HTTP 410 Gone** (the strongest, crawl-budget-cheapest removal signal):

- **Threshold:** `SOLD_LOT_410_AFTER = "90 days"` ([constants](../apps/web/src/constants/index.ts)).
- **Where:** [`proxy.ts`](../apps/web/src/proxy.ts) — a `/avtomobil/{id}` whose lot was
  archived ≥ 90 days ago returns `new NextResponse(null, { status: 410, headers: {
  "x-robots-tag": "noindex" } })`; fresh-sold and active cars fall through. The check
  ([`lib/sold-lot-gone.ts`](../apps/web/src/lib/sold-lot-gone.ts)) queries
  `car_listings_archived.archived_at < now() - '90 days'::interval`.
- **Why proxy, not the page:** `/avtomobil/[id]` is PPR — it streams a static 200
  shell, so `page.tsx` **cannot** emit a 410 status. The proxy runs on Next 16's
  Node.js runtime (edge unsupported), so the DB lookup is safe; it wraps the Auth.js
  handler (one `proxy` export) and **fails open**.
- **Depends on** `archived_at` (migration [`0023`](../packages/db/migrations/0023_archived_at.sql)):
  SET-ONCE on the archived projection, preserved across recomputes (unlike
  `updated_at`) — the true "how long archived" age signal. See [02](02-data-model-and-tables.md) / [05 §6](05-projection-tables-car-listings.md).

> As of writing, **nothing is old enough to 410 yet** (archive timestamps span
> < 90 days); the mechanism activates as lots age.

## 4. Brand/model hub pages — the durable ranking asset

An individual car page ranks briefly then dies; a **model hub** accumulates
authority across inventory churn. This is where transient inventory *earns* durable
organic traffic (per `12-web-seo-strategy.md` §4.2/§4.3).

- **Model hub** `/avtomobili/marka/{make}/{model}` — [`[make]/[model]/page.tsx`](../apps/web/src/app/avtomobili/marka/[make]/[model]/page.tsx).
  A slug↔external-id resolver ([`get-car-hub.query.ts`](../apps/web/src/queries/cars/get-car-hub.query.ts)
  + [`lib/car-slug.ts`](../apps/web/src/lib/car-slug.ts) — there is **no** DB slug
  column; names are slugged and matched, ties broken by `cars_qty`).
- **Brand hub** `/avtomobili/marka/{make}` — [`[make]/page.tsx`](../apps/web/src/app/avtomobili/marka/[make]/page.tsx),
  a "browse by model" grid linking down to model hubs.
- **Thin-content guard:** a hub with `< MIN_HUB_LISTINGS_TO_INDEX` (**3**) live
  listings still renders but is `{ index: false, follow: true }` — no thin pages in
  the index.
- **Data-driven copy** ([`get-model-hub-stats.query.ts`](../apps/web/src/queries/cars/get-model-hub-stats.query.ts)):
  intro + FAQ come from each model's **real aggregates** (price band, year range,
  dominant source country, buy-now count), so hubs genuinely differ per model rather
  than being one template with a swapped name.
- **Structured data:** Breadcrumb + ItemList + FAQPage JSON-LD.
- **Internal linking:** car-detail breadcrumb → model hub → brand hub, so authority
  flows catalog → brand → model, and from ~945k detail pages up into the hubs. This
  also mitigates that the catalog SSRs only its first page (deep listings are
  reachable via the per-car sitemap + hub link surfaces, not via crawlable page-2..N
  catalog URLs).

## 5. Sitemaps & robots

- **Per-car sitemap** — [`avtomobil/sitemap.ts`](../apps/web/src/app/avtomobil/sitemap.ts):
  active cars only, split into 50k-URL chunks (`/avtomobil/sitemap/{id}.xml`); sold
  cars are excluded.
- **Hub sitemap** — [`avtomobili/marka/sitemap.ts`](../apps/web/src/app/avtomobili/marka/sitemap.ts):
  only indexable hubs (same ≥3 threshold), ~96 brand + ~1047 model URLs.
- **Static sitemap** — `/sitemap.xml` for the fixed pages.
- **[`robots.ts`](../apps/web/src/app/robots.ts):** explicitly **allows** the major
  AI crawlers (GPTBot, OAI-SearchBot, ChatGPT-User, ClaudeBot, Claude-Web,
  PerplexityBot, Google-Extended, Applebot-Extended, CCBot); **disallows** `/api/`,
  `/lyubimi` (favourites), the auth pages, and `?status=past`; and enumerates all
  sitemap URLs (Next 16 doesn't emit a `<sitemapindex>` for `generateSitemaps`, so
  the chunk URLs are listed explicitly). Keep the disallow set in sync with the
  page-level `robots` directives.

## 6. Structured data (JSON-LD)

Active car detail pages emit a **`Car` ⊂ `Vehicle` ⊂ `Product`** node with `offers`
+ vehicle attributes directly on it ([`lib/car-detail-jsonld.ts`](../apps/web/src/lib/car-detail-jsonld.ts));
sold cars emit **none** (`if (detail.isPast) return null`).

> **Google deprecated the Vehicle-Listing rich result in September 2025**, so there
> is no Google vehicle rich result to be eligible for. We **keep** the schema anyway:
> `Car`/`Vehicle` remain valid Schema.org types and their value shifted to **AI
> search / Bing / voice** — given the GEO bet (§7), the JSON-LD is now an
> **AI-citation asset**, not a Google-rich-result one.

## 7. GEO (AI search) posture

Generative-engine optimization is an uncontested win in this niche (the 2026-07
re-audit confirmed the biggest inventory competitors — bidmotors, mrcars, wincars,
usacars, plc.auction — block AI crawlers, mostly via Cloudflare edge 403s). We
explicitly allow the AI crawlers (§5) and keep passage-citable structured content
(hub FAQs, per-model aggregates, `Car` JSON-LD). Nuance from the re-audit: AI
Overviews/AI Mode inclusion rides on **normal Googlebot indexing** (Google-Extended
only gates Gemini training), AI systems read **visible HTML, not JSON-LD**, and
`llms.txt` is consumed by no major AI system (Mueller/Illyes) — we keep
[`public/llms.txt`](../apps/web/public/llms.txt) as zero-cost hygiene but invest no
further in it. Strategy detail: `12-web-seo-strategy.md` §6.

## 8. Known gaps / not built

- **Money pages orphaned from global nav** *(2026-07 audit)* — the primary header
  NAV and FOOTER_NAV link none of: the 3 country hubs, `/proverka-vin`, the FAQ hub,
  `/otzivi` (only FOOTER_INFO links `/kalkulator`), and the homepage links only to
  the filtered catalog. Cross-links exist between the SEO pages themselves, but the
  site-wide anchors from `12 §7` are not wired.
- **`llms.txt` is stale** — it omits the country hubs, `/kalkulator`, `/proverka-vin`,
  `/chesto-zadavani-vaprosi` and `/otzivi`; refresh when touching it next.
- **Canonical/OG gaps** — `/za-nas`, `/carfax`, `/proces` set title+description but
  no `alternates.canonical` and no OG object.
- **Dedicated model auction-*price* pages** ("BMW 530 цени от търг" → avg/min/max/
  count with `AggregateOffer` JSON-LD) — distinct from the model *hubs* (§4, which
  carry a price *band* in their copy). Still a future feature; the archive data +
  the AuctionsAPI `/statistics` endpoint would support it.
- **Crawlable catalog page-2..N URLs** — the catalog only SSRs its first page;
  deep-listing crawl paths come from the hubs + per-car sitemap instead (§4).
- **Legacy WordPress cutover** — the old WP site will be **removed entirely** (decision
  2026-07); its 391 car-sitemaps / dead URLs are handled by a redirect/410 map served
  by this rebuild from day one of cutover — see
  [13-seo-action-plan.md](13-seo-action-plan.md) Phase 0.
