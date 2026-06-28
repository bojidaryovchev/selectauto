# SelectAuto.bg — Market Research & SEO Architecture Blueprint

> Market: **Bulgaria only** (Bulgarian language, Google.bg)
> Business: Car import from **Korea, USA, Canada, Japan, Germany** via auctions — full import handling, Carfax/VIN checks, lead-generation focused.
> Goal priority: **(1) Lead generation → (2) Inventory/listing visibility → (3) Brand/topical authority**, with a shared content/authority layer feeding all three.

---

## 0. TL;DR — What to do

1. **Fix the technical foundation first** (it's actively hurting you): kill Korean characters and mixed-language slugs in `/car/` URLs, deindex test/junk pages (`sql-cars-test`, `new-sql-listing`, `sample-page`, `all-cars-dashboard`), consolidate the duplicate "all cars" pages, and standardize on **transliterated Latin slugs** (the field norm).
2. **Win where competitors are weak, not where they're strong.** Don't fight bidmotors/mrcars on raw listing volume (1M+ / 476k pages). Win on: **schema markup** (9/10 competitors have none), **Korea + Japan + Germany country hubs** (uncontested), a **best-in-class cost calculator + VIN/Carfax tool**, and **named-expert E-E-A-T**.
3. **Build 5 country hubs** (`/vnos-korea`, `/vnos-usa`, `/vnos-kanada`, `/vnos-yaponiya`, `/vnos-germaniya`), each = pillar page + FAQ schema + calculator instance + trust section + programmatic make/model children.
4. **Ship schema.org JSON-LD from day one** — FAQPage, Vehicle/Car+Offer, AutoDealer, Review/AggregateRating, BreadcrumbList. This is the single biggest low-effort rich-results / AI-Overview win.
5. **Programmatic listing pages** from the AuctionsAPI feed with thin-content safeguards: `{make}/{model}` and `{make} {model} внос от {държава}`.

---

## 1. Business & current-state analysis (selectauto.bg)

**What it is:** A car-import concierge. Sources vehicles from Korea, USA, Canada, Japan, Germany via auctions (Copart, IAAI, Manheim, Encar/Korean auctions), handles the full chain — selection → auction bidding → payment/docs → logistics/customs → delivery ready for KAT registration. Positioned as "not a catalog, a process." Lead-gen model (inquiry/consultation forms, phone, Carfax requests).

**Platform:** WordPress + WooCommerce (robots.txt blocks `add-to-cart`, `add_to_wishlist`, `orderby` — WooCommerce signatures). Custom `car` post type with **391 car-sitemaps** → very large inventory (tens of thousands of listings).

**Current SEO problems found (must-fix):**

| Problem | Evidence | Impact |
|---|---|---|
| **Korean characters in URL slugs** | `/car/2022-kia-sportage-...-%ed%8a%b8%eb%a0%8c%eb%94%94-2/` | Ugly, non-clickable, dilutes keyword relevance, looks spammy to Google |
| **Mixed Cyrillic/Latin/Korean slugs** | `/car/2016-audi-%eb%89%b4-a6...` | Inconsistent URL strategy, encoding bloat |
| **Indexed test/junk pages** | `/sql-cars-test/`, `/sql-car-test/`, `/new-sql-listing/`, `/sample-page/`, `/all-cars-dashboard/` | Index bloat, wastes crawl budget, dilutes quality signals |
| **Duplicate "all cars" pages** | `/cars/`, `/всички-автомобили/`, `/коли-за-продажба/`, `/all-cars-dashboard/` | Keyword cannibalization, split signals |
| **Mixed Cyrillic page slugs** | `/процес/`, `/за-нас/`, `/контакти/`, `/вноc/` (note `c` is Latin in "вноc" — broken) | Inconsistent; the `/вноc/` typo is a broken/duplicate-risk slug |
| **Listing pages = spec table only** | `/car/2024-bmw-x3/` has emoji + specs, no descriptive content, **no price shown** | Thin content at scale → index bloat / low rankings; no price hurts CTR & schema |
| **No schema detected** | — | Missing rich results & AI-Overview eligibility |

**Strengths to keep:** large live auction-fed inventory (data pipeline = your moat for programmatic SEO), genuine multi-country sourcing (Korea + Japan + Germany are uncontested), Carfax positioning, clear process story.

---

## 2. Competitive landscape

The market splits into two models:

**A) Programmatic marketplaces (huge inventory):**
- **bidmotors.bg** — biggest; Next.js; ~1M+ product URLs; VIN-in-slug; `/carfaxes`, `/credit`, `/leasing`; strong E-E-A-T; **no schema**.
- **mrcars.bg** — best-engineered SEO; 476k listings; **richest schema in market** (AutoDealer, Car/Offer, FAQPage, 274 reviews w/ AggregateRating, named inspector); BUT **broken sitemap + empty `<title>` tags + no blog**.
- **usaauto.bg** — OpenCart; large inventory; **no sitemap, no robots.txt, query-param blog URLs, zero E-E-A-T**.
- **koreatrade.bg** — WooCommerce; Korea/Hyundai-Kia; messy mixed Cyrillic/Latin/demo slugs; ~176 cars.

**B) Content/lead-gen sites (thin/no inventory):**
- **xclusivecars.bg** — best content+calculator combo; ~5,000-word pillar, "X vs Y" cluster, interactive cost calculator, influencer partner. No schema.
- **koliotamerika.bg** — USA content authority; deep objection-handling (salvage/flood/mileage fraud); nested pillar URLs; no calculator, no indexable inventory.
- **koreaauto.direct** — most sophisticated Korea specialist; richest toolset (multi-currency calculator, VIN checker, offer-comparison); BUT **blocks AI crawlers** (forfeits GEO).
- **wincars.bg** — strong content + **~28 programmatic city pages** (`/v-{city}/`); model-review series; no calculator.
- **libertyauto.bg** — clean country + comparison content; **no tools, no lead form** (phone only).
- **importlux.bg** — weakest; unmodified theme demo; zero real SEO.

### Table-stakes (what a credible entrant must have)
Transliterated Latin slugs · per-country landing pages (USA/Canada/Korea min.) with on-page FAQ · process/steps section · testimonials/Google reviews · blog with cost/customs/VIN guides · Viber group CTA. Strongly expected: import-cost calculator + curated/live listings.

### Open gaps selectauto can exploit
1. **Schema.org JSON-LD** — 9/10 have none → easiest rich-results / AI-Overview win.
2. **Technical hygiene** — broken/missing sitemaps (mrcars, usaauto), demo clutter (koreatrade) → clean foundation = structural edge.
3. **GEO / AI-search** — koreaauto blocks AI crawlers; mrcars has empty titles → deliberately optimize for ChatGPT/Perplexity/AI Overviews (clean titles, FAQ schema, llms.txt, allow ClaudeBot/GPTBot).
4. **Self-serve VIN/Carfax checker** — only 2/10 offer one.
5. **Best-in-class cost calculator** — half the field has none/static.
6. **Japan & Germany country pillars** — **uncontested keyword space** (Germany always folded into "Europe"; Japan absent everywhere).
7. **Programmatic city pages** — only wincars does it.
8. **"X vs Y" + country-vs-country comparison clusters** — thinly covered, proven to convert.
9. **Objection-handling depth** (salvage/flood/mileage fraud) — builds trust + authority.
10. **Named-expert E-E-A-T** — almost nobody has expert bios; Dec 2025 E-E-A-T update rewards this.

---

## 3. Keyword / intent map (8 clusters)

Demand inferred from competitor page titling, SERP richness, FAQ/PAA phrasings, forums, and mainstream coverage (bTV ran a 2026 import explainer = broad demand). **USA/Canada head terms are saturated; Korea is the winnable wedge; Japan/Germany are open.**

1. **Transactional head terms** (money pages): `внос на коли от Америка/САЩ/Канада/Корея/Япония/Германия`, `коли от аукцион`, `автомобили от Корея за продажба`, `вносител на коли`. → Korea is the differentiator; build the deepest Korea hub on the BG web.
2. **Cost / calculator** (highest conversion): `колко струва внос на кола от Америка`, `калкулатор внос автомобил`, `мито и ДДС внос автомобил`, `такси внос кола`. → Calculator with gated PDF estimate = #1 lead-capture asset.
3. **Process / how-to** (authority): `как се внася кола от Америка`, `документи за внос`, `колко време отнема внос`, `транспорт на автомобил от САЩ`.
4. **Trust / verification** (GEO gold): `Carfax проверка`, `проверка на VIN`, `история на автомобил`, `Encar Diagnosis`, `salvage/flood title`.
5. **Source comparisons** (mid-funnel): `Корея или Америка`, `Канада или САЩ`, `корейски коли на газ / LPI` (**near-empty, high-differentiation**).
6. **Make/model + source long-tail** (programmatic): `{Марка} {Модел} внос от {Държава}`, `{Марка} {Модел} на газ/LPI`, body-style (`джип/пикап/електрическа кола внос`).
7. **Branded / auction**: `Copart какво е`, `IAAI`, `Manheim`, `Encar`, `Copart или IAAI`.
8. **Local / KAT / legal**: `регистрация в КАТ внесен автомобил`, `екотакса 2026`, `мито/ДДС/акциз автомобил`, `технотест/хомологация`.

**FAQ-schema / AI-Overview targets** (real high-intent questions): „Колко струва внос на кола от Америка?" · „Колко време отнема?" · „Какво мито и ДДС се плаща?" · „Какви документи са нужни?" · „САЩ или Канада?" · „Какво е Carfax/Encar?" · „Какво е salvage/flood title?" · „Какво е екотакса?" · „Как се регистрира в КАТ?"

---

## 4. Recommended SEO site architecture

### 4.1 URL strategy (decision)
- **Standardize on transliterated Latin slugs** (field norm; avoids the Cyrillic/Korean encoding mess). Bulgarian-readable transliteration, e.g. `/vnos-na-koli-ot-korea/`.
- One canonical home for each concept — **kill the duplicate "all cars" pages**.
- Listing slug: drop the Korean source-string entirely. Pattern: `/avtomobili/{year}-{make}-{model}-{trim}/` with a numeric ID for disambiguation instead of `-2`, `-3` suffixes, e.g. `/avtomobili/2022-kia-sportage-1-6-t-2wd-{id}/`.

### 4.2 Top-level information architecture

```
/ (home — brand + multi-country value prop + calculator teaser + featured listings)
│
├── COUNTRY HUBS (pillar + FAQ schema + calculator + trust + listings children)
│   ├── /vnos-na-koli-ot-korea/         ← FLAGSHIP (winnable, differentiator)
│   ├── /vnos-na-koli-ot-sasht/         (USA)
│   ├── /vnos-na-koli-ot-kanada/        (Canada)
│   ├── /vnos-na-koli-ot-yaponiya/      ← UNCONTESTED
│   └── /vnos-na-koli-ot-germaniya/     ← UNCONTESTED
│
├── INVENTORY (programmatic, auction-fed)
│   ├── /avtomobili/                    (all, faceted: make/model/year/fuel/transmission/body/country/price)
│   ├── /avtomobili/marka/{make}/       (brand hub, e.g. /avtomobili/marka/bmw/)
│   ├── /avtomobili/marka/{make}/{model}/   (model hub — programmatic SEO target)
│   └── /avtomobili/{year}-{make}-{model}-{trim}-{id}/   (individual listing)
│
├── TOOLS (link magnets + lead capture)
│   ├── /kalkulator/                    (multi-country itemized cost calc + gated PDF)
│   ├── /proverka-vin/                  (VIN/Carfax checker — only 2 competitors have this)
│   └── /sravni-oferti/                 (offer comparison — optional, koreaauto-style)
│
├── TRUST / CONVERSION
│   ├── /protses/                       (5-step process — keep, fix slug)
│   ├── /otzivi/                        (reviews — Review/AggregateRating schema)
│   ├── /za-nas/                        (About + NAMED EXPERTS/team bios — E-E-A-T)
│   ├── /chesto-zadavani-vaprosi/       (FAQ hub — FAQPage schema)
│   └── /kontakti/                      (LocalBusiness schema, NAP)
│
├── /blog/  (topical authority — clusters 3,4,5,7,8)
│   ├── process guides, cost guides, customs/КАТ guides
│   ├── trust/objection content (salvage, flood, mileage fraud, Carfax/Encar)
│   ├── comparison content (Korea vs USA, Canada vs USA, BMW X5 vs Audi Q7)
│   └── auction explainers (Copart vs IAAI, what is Encar/Manheim)
│
└── /vnos-na-koli/{city}/  (programmatic city pages — local long-tail, wincars-style)
    e.g. /vnos-na-koli/sofia/, /plovdiv/, /varna/, /burgas/, ...
```

### 4.3 Page templates

**Country hub** (e.g. `/vnos-na-koli-ot-korea/`):
- H1: „Внос на коли от Корея" · 2,000–3,000 words
- Why this country (Korea: LPI/газ, equipment, Encar trust; Canada: low rust, history; USA: volume/price)
- Embedded **calculator instance** pre-set to that country
- Process steps · cost breakdown table · trust/verification section · 6–12 featured live listings from that country · FAQ block (FAQPage schema) · testimonials · CTA form
- Internal links → model hubs, related blog pillars, comparison pages

**Model hub** (programmatic, e.g. `/avtomobili/marka/hyundai/santa-fe/`):
- Unique intro (2–3 sentences, model + import angle) · live listings of that model · model-specific cost estimate · history-check note (Carfax/Encar) · FAQ
- **Thin-content guard:** only generate if ≥N live/recent listings exist; otherwise noindex or fold into brand hub.

**Individual listing** (`/avtomobili/{...}-{id}/`):
- H1 = year + make + model + trim · **show price/estimate** (currently missing!) · full spec table · location/auction date · VIN (masked) · history-check CTA · inquiry form
- **Vehicle/Car + Offer schema**, BreadcrumbList
- **Index management:** noindex or 301 sold/expired auction lots to the model hub (avoid bidmotors/mrcars-style index bloat).

---

## 5. Schema.org plan (biggest low-effort win — 9/10 competitors have none)

| Page type | Schema |
|---|---|
| Site-wide | `Organization` / `AutoDealer` (name, logo, NAP, sameAs socials), `WebSite` + `SearchAction` |
| Listing pages | `Vehicle`/`Car` + `Offer` (price/availability), `BreadcrumbList` |
| Model & inventory listing pages | `ItemList` of `Car` |
| Country hubs + FAQ hub + listings | `FAQPage` |
| Reviews page + inline review widgets | `Review` + `AggregateRating` |
| Blog posts | `Article` with `author` (named expert — ties to E-E-A-T), datePublished/Modified |
| Contact / locations | `LocalBusiness` with geo + openingHours |

---

## 6. GEO / AI-search (uncontested — koreaauto blocks AI bots, mrcars has empty titles)
- **Allow** GPTBot, ClaudeBot, PerplexityBot, Google-Extended in robots.txt (don't repeat koreaauto's mistake).
- Add **llms.txt**.
- Clean, populated `<title>` and meta on every template (don't repeat mrcars' empty titles).
- Structure FAQ answers as self-contained, citable passages (question as H2/H3, concise factual answer) for AI Overviews / Perplexity.

---

## 7. Internal linking
- Home → 5 country hubs + calculator + featured listings.
- Country hub ↔ its model hubs ↔ individual listings (breadcrumb + contextual).
- Blog pillars → country hubs & calculator (transactional pages get the equity).
- Comparison posts → both relevant country hubs.
- Calculator & VIN tool linked site-wide (header/footer) as conversion anchors.

---

## 8. Prioritized roadmap

**Phase 0 — Technical foundation (weeks 1–2) — do before anything else**
- Deindex/remove test & junk pages (`sql-*`, `new-sql-listing`, `sample-page`, `all-cars-dashboard`).
- Fix listing slugs: strip Korean strings, standardize transliterated Latin pattern with numeric ID; 301 old→new.
- Consolidate duplicate "all cars" pages into one canonical `/avtomobili/`.
- Add price/estimate to listing template.
- Index management for sold/expired lots (noindex or 301).
- Verify sitemaps are clean & submitted; SEO plugin (Yoast/Rank Math) configured.

**Phase 1 — Money pages + tools (weeks 3–6) — primary goal: leads**
- Build 5 country hubs (Korea first, then USA/Canada, then Japan/Germany).
- Ship the **cost calculator** (multi-country, itemized, gated PDF) and **VIN/Carfax checker**.
- Roll out core schema (AutoDealer, FAQPage, Vehicle/Offer, Review).

**Phase 2 — Inventory visibility (weeks 5–10, overlaps) — goal: listings**
- Programmatic brand & model hubs with thin-content guards.
- Vehicle schema + breadcrumbs on all listings.
- Internal linking automation (country↔brand↔model↔listing).

**Phase 3 — Authority + GEO (weeks 8–16) — goal: brand/topical authority**
- Blog clusters: process, cost, trust/objection, comparison, auction explainers, КАТ/еко-такса (year-stamped, refreshed annually).
- Named-expert author bios + Article schema (E-E-A-T moat).
- Programmatic city pages.
- GEO: allow AI crawlers, llms.txt, citable FAQ passages.

---

## 9. Success metrics
- Indexed-page health: junk pages removed, listing pages indexed without bloat (sold lots pruned).
- Rankings: country head terms (esp. Korea/Japan/Germany), `колко струва` cost queries, model long-tail.
- Rich results: FAQ, review stars, vehicle results appearing in SERPs.
- AI citations: brand mentions/citations in AI Overviews, ChatGPT, Perplexity.
- Conversions: calculator completions, VIN-check submissions, inquiry-form leads.
