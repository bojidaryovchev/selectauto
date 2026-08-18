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
| **Paid de-indexed** car | `/avtomobil/[id]` | ❌ **410 within ~30s** | `cars.deindexed_at` → `proxy.ts` 410 (§3a) |
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
  is `isCarGone()` in [`lib/sold-lot-gone.ts`](../apps/web/src/lib/sold-lot-gone.ts),
  which tests `car_listings_archived.archived_at < now() - '90 days'::interval` — and
  the paid-de-index flag (§3a).
- **Not a query per request.** This runs on every car-page hit and traffic is ~99%
  crawlers, so `isCarGone()` answers from a 30s in-memory snapshot (one query per
  instance per TTL): the tiny set of de-indexed car ids, plus ONE boolean — is any
  archived row past 90 days yet? While that boolean is false nothing can 410 by this
  rule, so the per-id lookup is skipped entirely. It re-activates around **2026-09-21**
  (the oldest `archived_at` is 2026-06-23), after which the per-id fallback runs again
  for non-de-indexed cars; the durable fix at that point is to materialise the
  `archived_at + 90 days` 410 date rather than re-derive it per request.
- **Why proxy, not the page:** `/avtomobil/[id]` is PPR — it streams a static 200
  shell, so `page.tsx` **cannot** emit a 410 status. The proxy runs on Next 16's
  Node.js runtime (edge unsupported), so the DB lookup is safe; it wraps the Auth.js
  handler (one `proxy` export) and **fails open**.
- **Depends on** `archived_at` (migration [`0023`](../packages/db/migrations/0023_archived_at.sql)):
  SET-ONCE on the archived projection, preserved across recomputes (unlike
  `updated_at`) — the true "how long archived" age signal. See [02](02-data-model-and-tables.md) / [05 §6](05-projection-tables-car-listings.md).

> As of writing, **nothing is old enough to 410 yet** (verified 2026-08-14: 1,054,465
> archived rows, 0 over 90 days, oldest `archived_at` 2026-06-23); the mechanism
> activates as lots age.

## 3a. Paid de-index (`cars.deindexed_at`) — added 2026-08-14

Vehicle owners pay to have their listing delisted; an admin flips it from the back
office. Same 410 machinery as §3, but triggered by an explicit flag instead of a
timer, so it fires **within ~30s and regardless of archive age or active status**
(the de-indexed id set rides in the proxy's snapshot — §3 — refreshed every 30s).

- **Where the flag lives:** `cars.deindexed_at` (migration
  [`0043`](../packages/db/migrations/0043_car_deindex.sql)) — NOT on the projections,
  whose rows are DELETEd whenever a car stops qualifying for that table (an
  active→archived→active round trip would destroy a paid flag). Ingestion's upserts
  name their columns explicitly, so the flag survives every sync.
- **Keyed on the normalized VIN.** `car_deindex_requests.vin_normalized` =
  `upper(btrim(vin))`, CHECK-enforced, with a partial unique index allowing one
  ACTIVE request per VIN plus full revoked history. One vehicle owns SEVERAL
  `cars.id` rows (relists, Copart→IAAI), each with its own URL, so a car_id-keyed
  suppression would leave sibling URLs indexed — the exact failure a paying customer
  finds by googling their own VIN. Migration
  [`0044`](../packages/db/migrations/0044_cars_vin_normalized_idx.sql) adds the
  matching functional index (`CONCURRENTLY`, own file — see the note in it).
- **One round trip:** the check is folded into the §3 statement, not added
  alongside it. Both sides are PK point lookups (`cars_pkey` + the archived table's
  `car_id` PK); verified plan is a nested-loop of two index scans.
- **Second line of defence:** `getCarDetail` returns `null` for a de-indexed car, so
  even if the proxy is bypassed the route calls `notFound()`, which injects
  `noindex`. The proxy remains primary because only it can emit a real 410.
- **Cache:** `getCarDetail` now also carries a per-car tag (`carCacheTag(id)`, see
  [`lib/cache-tags.ts`](../apps/web/src/lib/cache-tags.ts)) so a single de-index can
  be expired with `updateTag()` without discarding all ~945k detail entries and the
  day-long sitemap cache. Note `revalidateTag(tag, "max")` is stale-while-revalidate
  and would still serve the de-indexed car — use `updateTag`.
- **Verified 2026-08-14** against a live ACTIVE car: 200 → set flag → **410 +
  `x-robots-tag: noindex`** → clear flag → 200, with no cache lag (the proxy check is
  uncached).

- **Full suppression (added 2026-08-17, migration
  [`0046`](../packages/db/migrations/0046_recompute_excludes_deindexed.sql)):** both
  recompute functions now exclude de-indexed cars, so the car leaves
  `car_listings` / `car_listings_archived` entirely. One change covers the catalog
  feed, the „Намерени: N" count, every filter dropdown, the brand/model hubs, BOTH
  hub sitemaps, the per-car sitemap chunks, the homepage rails, `/lyubimi`, the
  daily favourites digest, the related-cars carousel, the three country landing
  pages, and the catalog SEARCH box (which matches on VIN and bypasses the shared
  condition builder). Because the recompute runs inside `recompute_*_counted`, the
  `car_listing_counts` / `car_listing_facets` summaries get an exact delta — a
  hand-written `DELETE FROM car_listings` would corrupt them permanently.
- **Admin UI:** `/admin/skriti-obyavi` (search by VIN / lot number / URL → review
  every affected URL → record requester, proof and fee → suppress). The register
  doubles as the audit trail, and actions also land in `/admin/dnevnik`.
- **`/api/lot-check` needed its own guard** — it resolves the car and builds the
  page URL BEFORE consulting the projections, and is public + consumed by the
  shipped browser extension, so a projection change alone would not have hidden it.
- **IndexNow** is pinged on suppression (Bing/Yandex/Naver/Seznam/Yep accept
  deletion notifications). Google does NOT participate and has no removal API, so
  the Search Console request stays manual — the confirm dialog says so.

> **Still not done:** the Bing Webmaster `AddBlockedUrl` call, and a customer-facing
> "delisting certificate" PDF. `/proverka-vin` also still reports that auction
> records exist for the VIN — that data is upstream (AuctionsAPI) and cannot be
> suppressed by any change of ours; scope the customer promise accordingly.

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
  reachable via the hub link surfaces, not via crawlable page-2..N catalog URLs).
  Since the per-car sitemap was retired (§5) these links are the ONLY discovery path
  into the detail pages — which is the intended posture, not an oversight.

## 5. Sitemaps & robots

- **Per-car sitemap — RETIRED 2026-08-16.** The 19 × 50k-URL chunks
  (`/avtomobil/sitemap/{id}.xml`) that advertised all ~945k active cars are gone;
  the route was deleted so the chunk URLs now 404 and Google retires them.
  **Why:** measured against Google (DataForSEO, bg market, 2026-08-15) the whole
  945k-page corpus returned **1 ranking keyword / ~0.4 est. visits per month**,
  while the ~1,286 model hubs returned **54 keywords / ~24.6 visits** — 64% of
  everything the domain ranks for (domain total: 85 keywords, ~74 visits/mo). That
  long tail was drawing ~700k crawler requests/day, ~99% of all site traffic, at
  ~$330/mo of Vercel usage. Detail pages stay live, crawlable and indexable via the
  catalog and hub links — they are simply no longer pushed into Google's discovery
  queue, which is §1's crawl-budget doctrine applied to the ACTIVE tail as well as
  the sold one. Reviving a *curated* listing sitemap (a few thousand priced,
  photographed cars in makes that actually rank) is the open follow-up; the keyset
  chunking query survives at `queries/sitemap/get-listing-sitemap.query.ts` and the
  deleted route is in git history.
  *Expect GSC to report the retired sitemaps as unreadable until they are removed
  from its Sitemaps report — that is the normal retirement path, not a fault.*
- **Hub sitemap** — [`avtomobili/marka/sitemap.ts`](../apps/web/src/app/avtomobili/marka/sitemap.ts):
  only indexable hubs (same ≥3 threshold), ~96 brand + ~1047 model URLs.
- **Static sitemap** — `/sitemap.xml` for the fixed pages.
- **[`robots.ts`](../apps/web/src/app/robots.ts):** explicitly **allows** the major
  AI crawlers (GPTBot, OAI-SearchBot, ChatGPT-User, ClaudeBot, Claude-Web,
  PerplexityBot, Google-Extended, Applebot-Extended, CCBot); **disallows** `/api/`,
  `/lyubimi` (favourites), the auth pages, and `?status=past`; and points at the two
  remaining sitemaps (static + hubs). Since the listing chunks were retired it reads
  nothing from the database, so robots.txt can no longer be degraded by a DB hiccup.
  Keep the disallow set in sync with the page-level `robots` directives.

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

## 7a. Blog (added 2026-07-16)

Markdown posts in `apps/web/content/blog/*.md` (gray-matter frontmatter; filename
= URL slug) rendered server-side via react-markdown+remark-gfm — see
[`lib/blog.ts`](../apps/web/src/lib/blog.ts). `/blog` (index, ItemList+Breadcrumb)
and `/blog/[slug]` (BlogPosting JSON-LD with author/dates, breadcrumb, funnel CTA)
are fully static (`generateStaticParams` from the content dir). Posts feed the
root sitemap with per-post `lastmod` (= `updated` frontmatter) and are linked from
NAV („За нас" → Блог), FOOTER_INFO and llms.txt. 12 posts live at launch covering
the docs/13 content clusters; publishing = add a file + rebuild.

## 7b. Calculator lead capture (added 2026-07-16)

`/kalkulator` runs the v2 estimator (rates config `data/import-rates.ts`, stamped
with a verified-at date; Korea origin-declaration duty toggle) with a gated
email-offer flow: leads persist to `calculator_offers` (migration 0028) and get
the itemized breakdown by branded email — the breakdown is RECOMPUTED server-side
from raw inputs, never trusted from the client. Car detail pages deep-link in via
`?market=&price=` (USD→EUR converted), read by a Suspense-isolated
`useSearchParams` wrapper so the page keeps its static shell.

## 8. Known gaps / not built

- ~~Money pages orphaned from global nav~~ — **fixed 2026-07**: NAV/FOOTER carry the
  hubs, tools, FAQ, reviews and blog.
- ~~`llms.txt` stale~~ — **fixed 2026-07**: money pages + blog listed.
- ~~Canonical/OG gaps~~ — **fixed 2026-07** on `/za-nas`, `/carfax`, `/proces`.
- **Dedicated model auction-*price* pages** ("BMW 530 цени от търг" → avg/min/max/
  count with `AggregateOffer` JSON-LD) — distinct from the model *hubs* (§4, which
  carry a price *band* in their copy). Still a future feature; the archive data +
  the AuctionsAPI `/statistics` endpoint would support it.
- **Crawlable catalog page-2..N URLs** — the catalog only SSRs its first page;
  deep-listing crawl paths come from the hub + detail internal links instead (§4).
- **Legacy WordPress cutover** — the old WP site was **removed entirely** (decision 2026-07).
  A redirect/410 map for its old URLs was built then **removed 2026-07-18** at the owner's
  request (old site gone, ~zero equity/backlinks). See
  [13-seo-action-plan.md](13-seo-action-plan.md) Phase 0.
  **⚠️ Partly reversed 2026-08-16 — the "~zero equity" premise was wrong.** Ranked-keyword
  data (DataForSEO, bg market, 2026-08-15) shows legacy paths still ranking and 404ing,
  and they are the domain's BIGGEST organic asset: `/marka/hyundai/` at ~32.9 est.
  visits/mo on 15,680 search volume — about **45% of the domain's entire ~74 visits/mo** —
  plus `/marka/kia/`, `/marka/mazda/` and `/auction-car/143310/`. The old make/model
  taxonomy moved verbatim under `/avtomobili/`, so `next.config.ts` now maps
  `/marka/:path*` → `/avtomobili/marka/:path*` **permanently (308)**, covering both the
  brand and model tiers with one rule. `/auction-car/:slug*` joins `/car/:slug*` as a
  non-permanent catalog fallback (its WordPress post ids have no mapping to `cars.id`).
