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

- [ ] `[code]` **Redirect/410 map served by the rebuild from day one** (proxy.ts or
      next.config redirects; the sold-lot 410 pattern in `proxy.ts` is the template):
  | Legacy pattern | Action |
  |---|---|
  | `/процес/`, `/за-нас/`, `/контакти/` (+ percent-encoded variants) | 301 → `/proces`, `/za-nas`, `/kontakti` |
  | `/cars/`, `/всички-автомобили/`, `/коли-за-продажба/`, `/car/` (archive) | 301 → `/vsichki-avtomobili` |
  | `/car/{slug}` (~391k) | parse make/model from slug (`lib/car-slug.ts` matching) → 301 → model hub, else brand hub; **unparseable → 410** |
  | `/auction-car/{id}` | 410 |
  | `/sql-cars-test/`, `/sql-car-test/`, `/new-sql-listing/`, `/sample-page/`, `/all-cars-dashboard/`, `/вноc/` | 410 |
  | Old blog posts | 410, EXCEPT any we port into the new blog (301 then). Candidates found indexed: the Canada guide, „Yaris Cross vs Kona" comparison |
  | Anything else unmatched | 410 (with `x-robots-tag: noindex`) |
- [ ] `[code]` Redirect handling must decode percent-encoded Cyrillic/Korean slugs before matching.
- [ ] `[user]` **Google Search Console**: verify the domain property (DNS), submit the three
      new sitemaps, remove/let-die the old Yoast sitemaps, use the Removals tool on the junk
      URLs for fast de-indexing.
- [ ] `[user]` Keep hosting able to serve the 301/410s for **12+ months** (they must come from
      the new stack on the same domain — no parallel WP left running).
- [ ] `[ops]` Expect months of noisy GSC coverage reports (404/410 churn of ~391k URLs) — this
      is the intended outcome, don't "fix" it.

---

## Phase A — Wiring & hygiene (days; near-zero cost; do before any new content)

- [ ] `[code]` **Nav/footer wiring** — add to header nav and/or footer: the 3 country hubs,
      `/kalkulator`, `/proverka-vin`, `/chesto-zadavani-vaprosi`, `/otzivi`; link the hubs from
      the homepage. (Money pages are currently orphaned — 11 §8.)
- [ ] `[code]` **Refresh `public/llms.txt`** — add country hubs, calculator, VIN tool, FAQ hub,
      reviews (currently omits every money page).
- [ ] `[code]` **Canonical + OG** on `/za-nas`, `/carfax`, `/proces`.
- [ ] `[code]` **Listing `<title>` enrichment** — add price/fuel/„внос от {държава}" to
      `/avtomobil/[id]` titles (competitors' listing titles are uniformly thin; cheap CTR edge
      across ~945k pages).
- [ ] `[code]` **Visible masked VIN** on the listing spec sheet (currently JSON-LD-only).
- [ ] `[code]` **Organization `sameAs`** in the site-wide JSON-LD → real Facebook/Instagram/
      YouTube/Viber profiles (brand-disambiguation input).
- [ ] `[user]` **Google Business Profile**: claim/create, consistent „SelectAuto" NAP matching
      `/kontakti` — the brand SERP is currently owned by US namesakes + an unrelated „Select
      Auto BG" dealership.

## Phase B — Money-page depth (weeks 1–6; primary goal: leads)

- [ ] `[content]` **Deepen Korea/USA/Canada hubs** from ~600–900 to 2,000–3,000 words each,
      using the verified 2026 regulatory pack (12 §3.9): duty/VAT worked examples, ecotax
      bands + „последна проверка" date, honest transit times (Korea ~2 months), city-modifier
      section („Доставка до София/Пловдив/Варна/Бургас…"), „мнения"/objection content,
      testimonials block. Korea first (land-grab in progress), then USA (largest demand,
      trust/fraud angle mandatory), then Canada (CETA origin myth-busting).
- [ ] `[code]` **Calculator v2** (`/kalkulator`): itemized line-item output (auction fees,
      transport, duty, VAT, ecotax, homologation, ГТП/КАТ); **Korea origin-declaration toggle**
      (0% vs 10% duty), **Japan 0%-EPA toggle**, Canada default 10% with CETA note; ecotax age
      bands as config with „last verified" date; add DE/JP markets; **gated-PDF estimate as
      lead capture**.
- [ ] `[code+content]` **VIN tool retarget** — `/proverka-vin` copy/title to „vin проверка" /
      „проверка по вин номер безплатно"; add „вин проверка корея" section; `/carfax` targets
      brand demand („carfax цена", „carfax българия").
- [ ] `[code+content]` **Germany page** `/vnos-na-koli-ot-germaniya` — reframed: „по поръчка",
      „ддс", „фирми за внос", self-import vs service, mobile.de/AutoScout24 vs B2B auctions,
      odometer-fraud trust angle.
- [ ] `[code+content]` **Japan page** `/vnos-na-koli-ot-yaponiya` — single honest informational
      page: RHD reality, LHD-cars-in-Japan niche (10% duty — no EPA origin), „0% мито от 2026"
      hook, funnel to Korea. Weakest SERP in the niche = cheap to own.
- [ ] `[content]` „Колко струва внос на кола от САЩ през 2026" support guide (year-dated titles
      demonstrably win this SERP) interlinked with the calculator.

## Phase C — Content clusters, E-E-A-T & authority (weeks 4–16, overlaps B)

- [ ] `[code]` **Ship `/blog`** with `Article`/`BlogPosting` + named-`author` `Person` schema.
- [ ] `[user+content]` **Named-expert bios** on `/za-nas` + as blog authors (photos,
      credentials, first-hand import experience) — the E-E-A-T moat; currently zero names.
- [ ] `[content]` Cluster order (by validated demand): ① USA/Canada cost+trust (salvage/flood/
      „наводнена кола", title types, Copart-vs-IAAI, глосар) ② Korea (Encar guide — the
      „Encar България" SERP is junk; LPI/газ течна фаза; mileage authenticity; parts in BG;
      hidden fees) ③ comparisons („Корея или Америка" first) ④ КАТ/екотакса/хомологация
      guides ⑤ hybrid/EV-from-Korea. Year-stamp everything.
- [ ] `[ops]` **Quarterly regulatory re-verification loop** — ecotax draft (+24%) vs Държавен
      вестник, tariff steps, transit times; update „last verified" dates.
- [ ] `[user+ops]` **Authority/brand track (12–24 mo, aimed at bidmotors-held head terms)**:
      digital PR on newsjackable moments (EPPO fraud coverage → „как да проверите историята",
      Japan 0% duty, euro transition); BG directories/profiles; **creator partnerships**
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
