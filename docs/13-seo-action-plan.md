# 13 — SEO Action Plan (Consolidated Execution Checklist)

> The single to-do list distilled from [11-web-seo-and-indexing.md](11-web-seo-and-indexing.md)
> (as-built) and [12-web-seo-strategy.md](12-web-seo-strategy.md) (strategy + 2026-07 market
> re-audit). Strategy/evidence lives there; **this doc is only what we do, in what order, and
> who does it**. Owners: `[code]` = repo change, `[content]` = Bulgarian copywriting,
> `[user]` = needs accounts/admin/decisions only the owner has, `[ops]` = external/manual.
>
> Premise (decided 2026-07): **the legacy WordPress site will be removed entirely** and
> replaced by this rebuild on the same domain. All old-site remediation tasks are therefore
> superseded by the cutover plan in Phase 0.

---

## Phase 0 — Cutover: legacy WordPress → rebuild (at deploy time)

The old site has ~zero equity to protect (no measurable authority, broken titles sitewide,
absent from every top-20 — see 12 §2.0), so this is a cleanup, not a preservation exercise.
Goal: give Google an unambiguous, crawl-budget-cheap story for every legacy URL pattern.

- [x] `[code]` **Redirect/410 map served by the rebuild from day one** — **DONE 2026-07-15**:
      [`lib/legacy-redirects.ts`](../apps/web/src/lib/legacy-redirects.ts) wired into
      [`proxy.ts`](../apps/web/src/proxy.ts). Live-tested against the real DB (24+ cases incl.
      the actual Korean-character slugs from the audit) and hardened by an adversarial review
      (7 confirmed findings fixed: inbound query strings preserved on 301s; WP `-N` dedupe
      suffixes no longer mis-match single-digit model slugs; `/внос`+`/вноc` 301 → `/proces`
      instead of a soft-404 homepage redirect; 10-min reference-cache TTL bounds stale-slug
      windows after renames). As-built map:
  | Legacy pattern | Action (as built) |
  |---|---|
  | `/процес/`, `/за-нас/`, `/контакти/` (+ percent-encoded variants) | 301 → `/proces`, `/za-nas`, `/kontakti` |
  | `/cars/`, `/всички-автомобили/`, `/коли-за-продажба/`, `/car/` (archive) | 301 → `/vsichki-avtomobili` |
  | `/внос/`, `/вноc/` (broken Latin-c slug) | 301 → `/proces` |
  | `/car/{slug}` (~391k) | make/model parsed from slug → 301 → model hub, else brand hub; unparseable/DB-error → **410** |
  | `/auction-car/{id}` | 410 |
  | `/sql-cars-test/`, `/sql-car-test/`, `/new-sql-listing/`, `/sample-page/`, `/all-cars-dashboard/` | 410 |
  | Anything else unmatched | falls through to Next's 404 (the proxy never terminates live-app paths) |
- [ ] `[code]` Old blog posts: currently fall through to 404. When the new `/blog` ships,
      decide the port list (candidates found indexed: the Canada guide, „Yaris Cross vs Kona")
      → 301 ported posts, optionally add a blanket 410 for the rest.
- [x] `[code]` Percent-encoded Cyrillic/Korean slugs decoded before matching — done (verified
      with real `%D0%…`/`%ed%8a%…` paths).
- [ ] `[user]` **Google Search Console**: verify the domain property (DNS), submit the three
      new sitemaps, remove/let-die the old Yoast sitemaps, use the Removals tool on the junk
      URLs for fast de-indexing.
- [ ] `[user]` Keep hosting able to serve the 301/410s for **12+ months** (they must come from
      the new stack on the same domain — no parallel WP left running).
- [ ] `[ops]` Expect months of noisy GSC coverage reports (404/410 churn of ~391k URLs) — this
      is the intended outcome, don't "fix" it.

---

## Phase A — Wiring & hygiene (days; near-zero cost; do before any new content)

- [x] `[code]` **Nav/footer wiring** — **DONE**: `data/navigation.ts` puts the hubs under a
      top-level „Внос" (parent → Korea flagship), tools under „Инструменти", trust cluster
      under „За нас"; FOOTER_NAV carries the hubs, FOOTER_INFO the tools/FAQ/reviews.
- [x] `[code]` **`public/llms.txt` refreshed** — **DONE 2026-07-15**: country hubs, calculator,
      VIN tool, FAQ hub, reviews, brand-hub example all listed (BG+EN).
- [x] `[code]` **Canonical + OG** on `/za-nas`, `/carfax`, `/proces` — **DONE 2026-07-15**.
- [x] `[code]` **Listing `<title>` enrichment** — **DONE 2026-07-15**: active cars render
      „{title} — {цена}, внос от {Корея/САЩ/Канада} | SelectAuto"; country comes from the new
      `sourceCountry` (lot `location_country`; never guessed — Copart/IAAI span USA+Canada);
      sold cars keep price out of the title and label it „Продаден за" in the description.
      BONUS fix: upstream-duplicated titles (Ritchie-Bros-sourced IAAI trucks,
      „2020 Freightliner Cascadia 126 2020 Freightliner…") collapsed via `lib/title-clean.ts`
      in BOTH card + detail mappers.
- [x] `[code]` ~~Visible masked VIN~~ **RESOLVED DIFFERENTLY**: the FULL VIN is visible on the
      spec sheet (and in the Car JSON-LD) — deliberate deviation from the old blueprint's
      "masked" wording: visible VINs catch VIN searches (bidmotors' proven pattern) and
      masking would contradict the JSON-LD.
- [x] `[code]` **Organization `sameAs`** — **DONE**: `site-jsonld.ts` emits the real
      Facebook/Instagram/TikTok/Viber profiles from `constants` SOCIALS.
- [x] `[code]` _(unplanned, from review)_ Dead legacy path removed from `car-mapper.ts`
      (`toCarView` still linked WP-era `/коли-за-продажба/`, `/внос/` and double-prefixed the
      year); homepage DB-down fallback cards no longer link legacy `/car/{slug}` URLs.
- [ ] `[user]` **Google Business Profile**: claim/create, consistent „SelectAuto" NAP matching
      `/kontakti` — the brand SERP is currently owned by US namesakes + an unrelated „Select
      Auto BG" dealership.

### Page-by-page SEO audit (2026-07-16) — done, fixes applied

Three parallel auditors swept every route (27 page.tsx files), robots.ts, all three sitemaps,
JSON-LD-vs-visible-content consistency, H1s, and legacy-string leftovers. All 27 pages have
metadata; sitemaps/robots/noindex cross-checks passed. Confirmed issues, all **fixed**:

- [x] Stale sourcing geography in visible copy — `/proces` said „японски и германски аукциони",
      `/za-nas` (3 components) + the sitewide inquiry modal said „Европа" and omitted Korea —
      all now „Корея, САЩ и Канада".
- [x] Homepage had **two H1s** (sr-only keyword H1 + the ParticleHero slogan H1) — hero slogan
      demoted to a styled `<p>`.
- [x] robots.txt Disallow on `?status=past` conflicted with the page's `noindex, follow`
      (Disallow blocks crawling → Google can never read the meta; url-only indexing possible)
      — Disallow removed, page-level noindex is the single mechanism.
- [x] Carfax leads recorded a **dead legacy WP URL** as `page_url` — now the real
      `window.location.href`.
- [x] Two components hotlinked images from WP `wp-content/uploads` (one already 404 in
      production) — assets localized to `public/images/` (About poster regenerated from the
      video's first frame via ffmpeg).
- [x] No `not-found.tsx` — branded 404 added (header/footer + funnel links; Next auto-noindexes).
- [x] Breadcrumb JSON-LD ≠ visible breadcrumbs (extra „Начало" node on hubs/detail; catalog had
      markup but no visible breadcrumb) — markup now mirrors the visible trails exactly.
- [x] Missing OG on `/kalkulator` + `/kontakti`; `type` missing on `/carfax` — added.
- [x] `/kalkulator` had no contextual links — „Полезни страници" strip added (hubs, VIN, FAQ).
- [x] ~24 files used trailing-slash internal links (`/vsichki-avtomobili/` → 308 hop on every
      click/crawl) — normalized to the slashless canonical form repo-wide.

Deferred (noted, not bugs): `/kontakti` hero uses a stock Unsplash image (content-quality,
`[user]` to supply a real photo); `/proces` H1 is brand-voice not keyword-bearing (minor);
„vin проверка" phrasing lands with the Phase B VIN retarget.

## Phase B — Money-page depth (weeks 1–6; primary goal: leads) — **DONE 2026-07-16**

- [x] `[content]` **Deepen Korea/USA/Canada hubs** — DONE (Korea ~1,750 / USA ~1,250 / Canada
      ~1,150 words): Korea = origin-declaration duty story + Encar history verification + LPI
      + parts/service; USA = fraud-objection intro + title-types glossary (flood = the trap);
      Canada = CETA myth-busting + IAA Canada naming. All three: honest 2026 transit times,
      post-arrival steps (одобряване/екотакса/ГТП/КАТ), city-modifier paragraph, streamed
      Google-reviews testimonials (shared `components/hubs/hub-testimonials.tsx`, fail-open
      until the Places key is set), cross-market comparison links, FAQ 5→8/9 mirroring real
      SERP questions. **Bulgarian copy pending owner review** (esp. the operational claims:
      Korea „работим с износители…", Canada per-car preference flagging).
- [x] `[code]` **Calculator v2** — DONE: `data/import-rates.ts` config (rates stamped
      15.07.2026), itemized breakdown incl. екотакса bands + одобряване, Korea origin toggle,
      Canada 10% default, BGN dual display, honest transit; **gated EMAIL-offer lead capture**
      (deviation from „gated PDF": breakdown emails via the existing React-Email/Resend
      pipeline, lead persisted to `calculator_offers` — migration 0028 applied; PDF can come
      later). Listing deep links („Калкулирай вноса", USD→EUR converted). Adversarially
      reviewed — 3 findings fixed.
- [x] `[code+content]` **VIN tool retarget** — DONE: „VIN проверка … безплатно" title/H1,
      „VIN проверка на кола от Корея" section + FAQ (Encar-based history — Carfax doesn't
      cover Korean-domestic cars), `/carfax` retitled to „Carfax проверка в България".
- [x] `[content]` **Cost guide** — DONE as the blog's first post:
      `/blog/kolko-struva-vnos-na-kola-ot-sasht-2026` — worked example matching the
      calculator's math exactly (15 000 € → 24 690 €), „what cheaper offers omit" section,
      year-dated title, interlinked with calculator/hubs/VIN.
- [x] `[code]` _(pulled forward from Phase C)_ **`/blog` scaffold** — markdown files in
      `content/blog/` + gray-matter (frontmatter: title/description/date/updated/author),
      react-markdown+remark-gfm rendered server-side, `BlogPosting` JSON-LD with author +
      dates, breadcrumbs, sitemap entries (lastmod = post `updated`), nav/footer/llms.txt
      links. Fully static (fs reads at build).

> **CUT (2026-07):** the previously planned `/vnos-na-koli-ot-germaniya` and
> `/vnos-na-koli-ot-yaponiya` country pages — the business does not import from Germany or
> Japan, and a service page for an unserved country would be dishonest lead-gen. Their search
> demand is captured by two Phase C comparison posts instead (see cluster ③).

## Phase C — Content clusters, E-E-A-T & authority (weeks 4–16, overlaps B)

- [x] `[code]` **Ship `/blog`** — DONE (pulled into Phase B, 2026-07-16; see above). Posts
      default to author "SelectAuto" (Organization) — switch to NAMED experts per the bios
      item below.
- [ ] `[user+content]` **Named-expert bios** on `/za-nas` + as blog authors (photos,
      credentials, first-hand import experience) — the E-E-A-T moat; currently zero names.
- [~] `[content]` Content clusters — **6 posts live as of 2026-07-16** (all year-stamped,
      interlinked with hubs/calculator/VIN, rates footnoted to 15.07.2026):
      ✅ „Колко струва внос от САЩ 2026" (cost, cluster ①) · ✅ „Речник на американските
      аукциони" (глосар + title types + Copart-vs-IAAI, ①) · ✅ „Encar на български" (②) ·
      ✅ „Корея или Америка" (③) · ✅ „Корея или Германия?" (③ — the objection pillar) ·
      ✅ „Защо не внасяме от Япония" (③ — RHD explainer → Korea funnel) ·
      ✅ „Регистрация на внесена кола стъпка по стъпка" (④).
      **Remaining:** ② LPI/газ deep-dive + „скрити такси от Корея" + mileage-authenticity
      standalone; ① „наводнена кола" standalone; ⑤ hybrid/EV-from-Korea; model-specific
      guides (Tucson/Sportage/Sorento от Корея; Grand Cherokee от САЩ).
- [ ] `[ops]` **Quarterly regulatory re-verification loop** — ecotax draft (+24%) vs Държавен
      вестник, tariff steps, transit times; update „last verified" dates.
- [ ] `[user+ops]` **Authority/brand track (12–24 mo, aimed at bidmotors-held head terms)**:
      digital PR on newsjackable moments (EPPO fraud coverage → „как да проверите историята",
      euro transition); BG directories/profiles; **creator partnerships**
      (AvtoNonchev / ГаражЪ / Кентавър Авто tier — importer-owned channels demonstrably fail);
      consider a **mobile.bg storefront** for arrived cars (marketplaces hold ~60–75% of buyer
      attention).
- [ ] `[code]` Optional: `/sravni-oferti` offer-comparison tool (koreaauto.direct pattern).

## Phase D — Measurement & ground truth (ongoing)

- [ ] `[user]` **Keyword Planner pull** (free Google Ads account): absolute BG volumes for the
      ~40 keywords in 12 §3 → re-weight content budget. All current demand data is relative.
- [ ] `[user]` **One paid SERP-API snapshot** (~$50; DataForSEO/SerpApi): real Google.bg top-100
      + PAA + AI-Overview presence for the ~15 head queries. All current rankings are
      Brave-index proxies (12 §10).
- [ ] `[ops]` **Manual google.bg AIO spot-check** (real browser, BG IP): ~10 import queries —
      do AI Overviews trigger, who's cited.
- [ ] `[ops]` **AI-citation test** (the unfilled research gap): ask Perplexity/Copilot/ChatGPT
      the top import questions in Bulgarian; record cited domains; check whether
      AI-crawler-blocking competitors still get cited.
- [ ] `[ops]` **Quarterly competitive re-sweep** — the market moved massively in ~6 months
      (schema adoption, Korea land-grab, AI-crawler walls); re-run the 12 §2 audit quarterly.
      Watch items: bidmotors' Korea push + Tranco trajectory, wincars' Korea model pages,
      carsdirect's Korean inventory, mrcars fixing its sitemap/titles, hdcarscanada↔mrcars
      shared-infra anomaly.
- [ ] `[ops]` GSC-based KPIs per 12 §9: indexation health, query positions vs the §3 map,
      branded-demand trend (Trends geo=BG), calculator/VIN/Carfax/inquiry conversions by entry
      page. Milestone ladder: outrank zero-authority cohort → mrcars' empty-title `/import/*`
      pages → mid-tier (wincars/xclusivecars/koliotamerika/carhunters).

---

## Dependency notes

- Phase 0 fires **at deploy/cutover**, independent of A–D; build the redirect map early so
  cutover isn't blocked on it.
- Phase A before B: no point deepening pages that aren't linked from the nav.
- Keyword Planner + SERP snapshot (D) ideally land **before** Phase C budget decisions; they
  refine, not block, Phase B (Korea/USA priority is already demand-validated).
- The blog (C) unblocks the internal-linking pattern that wins these SERPs (pillar + 2–3
  supporting articles, per 12 §7).
