# 12 — Website SEO Strategy (Market Research & Architecture)

> **Status (docs currency).** This is the SEO **strategy / roadmap** — the *why* and the
> plan. For what is **actually built**, see [11-web-seo-and-indexing.md](11-web-seo-and-indexing.md)
> (the as-built technical SEO). As of **2026-07**, much of Phases 0–2 has **shipped**:
> transliterated Latin slugs, junk-page/index management, model + brand hubs (§4.2),
> Vehicle/Car+Offer + FAQPage/ItemList/Breadcrumb schema (§5), GEO / AI-crawlers + `llms.txt`
> (§6), the `/kalkulator` cost calculator, the `/proverka-vin` checker, the **Korea / USA /
> Canada** country hubs (§4.2), the FAQ hub, and `/otzivi` reviews — i.e. ALL country hubs the
> business actually needs (Japan/Germany are not served — see the correction below). **Still
> pending:** blog clusters, named-expert bios, and **nav/footer wiring
> of the money pages** (§7). §1 describes the **legacy WordPress** site being replaced.
>
> **Research refresh (2026-07-15).** §§2–3 and 5–9 were rewritten after a full re-audit:
> fresh crawls of all 10 originally-audited competitors (with adversarial re-verification of
> every contradicted claim), 11 newly-discovered competitor audits, Bulgarian SERP sweeps
> (Brave `country=bg` + Google autocomplete `hl=bg&gl=bg` — Google.bg proxy, see §10 caveats),
> Google Trends demand data (geo=BG, 5y), link-authority proxies (Majestic Million / Tranco),
> regulatory verification against primary sources (customs.bg, EUR-Lex, customs.go.jp, MOEW),
> and Google-updates verification (Search Status Dashboard). Major reversals vs the early-2026
> snapshot are marked **[CHANGED 2026-07]**.

> Market: **Bulgaria only** (Bulgarian language, Google.bg)
> Business: Car import from **Korea, USA and Canada** via auctions — full import handling, Carfax/VIN checks, lead-generation focused.
> **[CORRECTED 2026-07]** Earlier versions of this doc listed Japan and Germany as sourcing
> countries — the business does NOT serve them. All Japan/Germany "country hub" plans are cut;
> the residual search demand is captured by comparison/objection **content** instead (§3.6, §4.2).
> Goal priority: **(1) Lead generation → (2) Inventory/listing visibility → (3) Brand/topical authority**, with a shared content/authority layer feeding all three.

---

## 0. TL;DR — What to do

1. **The schema gap is gone — schema is now table stakes, not the moat.** **[CHANGED 2026-07]**
   bidmotors, mrcars, xclusivecars, koreaauto.direct, koliotamerika, usaauto, plc.auction and
   karai.bg all ship JSON-LD now (verified in server HTML). Schema still wins against the
   zero-authority mid-tier and matters for product snippets/Bing — keep shipping it — but the
   strategy's edge has moved to: **content depth + demand-matched pages + open AI-crawler
   posture + E-E-A-T + an authority/brand track**.
2. **Korea is demand-validated AND contested — depth and speed, not presence.** **[CHANGED 2026-07]**
   „внос на коли от корея" is autocomplete suggestion **#1** on Google.bg for „внос на коли от"
   and the fastest-growing country term (Trends: emerged ~2 years ago, accelerating). But
   bidmotors, wincars (Korea hub + 18 Korea model pages), libertyauto, mrcars, carsdirect
   (~110k Korean lots) and ~10 small specialists all entered. Win with what they can't copy:
   live inventory + model hubs, LPI/factory-gas content, an Encar guide, transparent landed
   costs, and the FTA origin-declaration story (§3.9).
3. **USA/Canada („Америка") is the LARGEST demand pool — upgrade to co-primary.** **[CHANGED 2026-07]**
   Trends: „коли от америка" ≈ 2.5× „коли от корея" in the latest year and still growing.
   Bulgarians say „америка" more than „сащ". Trust is the dominant anxiety (the EPPO salvage-
   fraud scandal drives the media narrative) — lead with transparency/objection content.
4. **Japan & Germany hubs CUT — the business doesn't serve those countries.** **[CORRECTED 2026-07]**
   (The demand data independently supports the cut: Japan ~zero in Trends across 262 weeks;
   Germany's head term ~zero, with the real demand phrased as self-import intent.) What
   survives is comparison/objection **content**: „Корея или Германия?" is the #1 objection a
   Korea/USA importer faces in Bulgaria (Germany is the default import channel), and a „Защо
   не внасяме от Япония" explainer can own the weakest SERP in the niche while honestly
   funneling that demand to Korea. Blog posts, not country pages — never imply a service we
   don't offer.
5. **GEO is live and selectauto's open posture is a real edge — but re-weight the tactics.** **[CHANGED 2026-07]**
   AI Overviews are live in Bulgaria **and in Bulgarian** since May 2025; AI Mode too. Google
   holds ~96% of BG search, so Google AI surfaces (ridden via normal indexing) are the game.
   bidmotors, mrcars, wincars, usacars, atlanticexport and plc.auction all **block AI crawlers**
   (mostly Cloudflare edge 403s) — selectauto stays open. `llms.txt`: keep, don't invest (no
   major AI system consumes it — Mueller/Illyes). The citable unit is the **visible Bulgarian
   Q&A passage**, not JSON-LD. Add **YouTube/creator presence** (strongest AIO-visibility
   correlate; the niche's demand is being built on YouTube right now).
6. **New workstream: authority + brand.** **[NEW 2026-07]** selectauto.bg registers zero on
   every authority proxy (no Tranco/Majestic presence, zero branded search, never archived by
   Wayback) and the brand collides with an unrelated „Select Auto BG" dealership plus US/RO/HU
   namesakes. Beating the zero-authority cohort is a content fight (winnable now); beating
   bidmotors (Majestic top-1M, #494 among .bg, exploding branded demand) is a 12–24-month
   link/brand program. **mrcars is the realistic 12-month overtake target.**
7. **Wire the money pages into the site.** **[NEW 2026-07]** The country hubs, `/proverka-vin`,
   FAQ hub and `/otzivi` are orphaned from the primary nav/footer (only `/kalkulator` gets one
   footer link) — undoing the internal-linking plan in §7. Fix before any new content ships.

---

## 1. Business & current-state analysis (selectauto.bg — legacy WordPress site)

**What it is:** A car-import concierge. Sources vehicles from Korea, USA and Canada via auctions (Copart, IAAI, Encar; the old site's copy also name-dropped Japan/Germany/Manheim, but those were never real sourcing channels), handles the full chain — selection → auction bidding → payment/docs → logistics/customs → delivery ready for KAT registration. Positioned as "not a catalog, a process." Lead-gen model (inquiry/consultation forms, phone, Carfax requests).

**Platform:** WordPress + WooCommerce (robots.txt blocks `add-to-cart`, `add_to_wishlist`, `orderby` — WooCommerce signatures). Custom `car` post type with **391 car-sitemaps** (~391k `/car/` URLs, still actively updated).

**Current SEO problems (re-verified live 2026-07-15):**

| Problem | Evidence | Status 2026-07 |
|---|---|---|
| **Korean characters in URL slugs** | `/car/2022-kia-sportage-...-%ed%8a%b8%eb%a0%8c%eb%94%94-2/` | Still live (200, no redirect) — but sampling shows a **minority** of the ~391k URLs |
| **Indexed test/junk pages** | `/sql-cars-test/`, `/sql-car-test/`, `/new-sql-listing/`, `/sample-page/` | **Still 200, `index,follow`, self-canonical, and explicitly listed in page-sitemap.xml** — provably fed to Google |
| **`/all-cars-dashboard/`** | — | Now 302s to wp-login **but still sitemapped** — remove from sitemap |
| **Duplicate "all cars" pages** | `/cars/`, `/всички-автомобили/`, `/коли-за-продажба/` | Still 200, self-canonical, all sitemapped — unconsolidated |
| **Listing pages: no price** | — | **FIXED on the old site** — listings now server-render an EUR price card (+KRW original) **[CHANGED 2026-07]** |
| **No vehicle schema** | Listing JSON-LD = Yoast defaults only (WebPage/Organization/Breadcrumb) | Still true — no Vehicle/Product/Offer anywhere |
| **Broken site title** _(new finding)_ | `<title>- Избери мечтания си автомобил</title>` — empty sitename variable; indexed snippets show the bare dash | Sitewide; every indexed title is damaged |
| **`/auction-car/` canonical defect** _(new finding)_ | `/auction-car/81943/` is indexable but canonicalizes to the **homepage** | Mass mis-canonicalization across the pattern |
| **Yoast auto-`llms.txt` advertises junk** _(new finding)_ | `selectauto.bg/llms.txt` (Yoast v26.9) lists the SQL test pages first | Junk cleanup now has an AI-visibility rationale too |
| **robots.txt has no `Sitemap:` directive** | — | Still true |

**Strengths to keep:** large live auction-fed inventory (data pipeline = your moat for programmatic SEO), genuine multi-country sourcing, Carfax positioning, clear process story.

> The legacy-site cleanup (410 junk pages, fix sitemap, redirect map old→new) is a **separate
> migration task** from the Next.js strategy — see [11 §8](11-web-seo-and-indexing.md). The
> re-audit escalates it: junk pages are provably crawlable + sitemap-submitted, and every
> indexed snippet carries the broken title.

---

## 2. Competitive landscape — refreshed 2026-07-15

All 10 original competitors re-crawled; every materially contradicted baseline claim was
independently re-verified by a second agent using different methods (verdicts noted).
**The market moved fast in ~6 months: schema everywhere, Korea land-grab, AI-crawler walls.**

### 2.0 Authority reality check **[NEW 2026-07]**

Free-proxy link/authority comparison (Majestic Million, Tranco, Google Trends branded demand,
Wayback age — Ahrefs/Moz/OpenPageRank are key/captcha-gated):

- **bidmotors.bg is a runaway tier of one**: the only niche domain in Majestic's top-1M link
  graph (#494 among all .bg, 286 referring subnets), Tranco ~115k and **halving its rank in 5
  weeks**, branded search avg 10.3 and growing (everyone else ≈ 0). It also out-schemas the
  live selectauto site. Schema/content alone will not displace it — that fight needs links,
  PR and brand demand over 12–24 months.
- **mrcars.bg is a distant, catchable #2** (Tranco ~1.08M, nascent branded demand, no Majestic
  presence). Realistic 12-month overtake target.
- **Everyone else — including selectauto.bg — is tied at zero** measurable authority. In this
  cohort, on-page + content + technical quality genuinely decides rankings, so the blueprint's
  original bet holds **for this segment**.
- selectauto.bg specifics: zero branded demand, **zero Wayback captures ever**, no third-party
  editorial links found, and a brand collision (unrelated „Автокъща Select Auto BG" with
  mobile.bg/cars.bg/Facebook profiles; US „Select Auto" dealers own the brand SERP). Brand
  disambiguation (Organization + `sameAs`, Google Business Profile, consistent naming,
  отзиви page) is a required workstream.

### 2.1 Programmatic marketplaces (huge inventory)

- **bidmotors.bg** **[CHANGED 2026-07, verified]** — Rails + Hotwire (not Next.js), **≈6.1M**
  product URLs (was ~1M), VIN-in-slug. **Full schema now**: AutoDealer, Vehicle+Offer, FAQPage,
  BreadcrumbList, LocalBusiness (one invalid ImageObject block; Offer price 0/PreOrder defects).
  Added a **Korea landing page + catalogue filter** (attacking our wedge), a Romanian locale,
  and a fresh trilingual `llms.txt` — yet **Cloudflare 403-blocks GPTBot/ClaudeBot/PerplexityBot/
  CCBot**, and its sitemap 403s to non-Googlebot UAs (Bing-class engines starved). Weaknesses:
  no import-cost calculator, thin blog (8 posts), no named people, no hreflang, no canonical on
  vehicle pages. ~616 Google reviews across two offices.
- **mrcars.bg** **[CHANGED 2026-07, verified]** — Next.js, ~476k listings. Titles **partially**
  fixed: homepage/listings/catalog/reviews now populated; **still empty `<title>` on the money
  pages** `/import/usa|korea|canada|europe`, `/about`, calculators. Reviews 274→**295**
  (AggregateRating 4.8). **Sitemap still 404** (declared `/sitemaps/index.xml` and all fallbacks).
  Still no blog. Named-inspector claim no longer reproducible. Blocks AI crawlers at Cloudflare
  edge; no llms.txt. Schema still market-richest (Car+Offer with VIN; FAQPage on /import/usa).
- **usaauto.bg** — baseline holds: OpenCart 2.3/PHP 7.1 (EOL), ~10–15k Copart-fed listings, no
  sitemap, no robots.txt, blog frozen since 04/2024. Nuances: product pages *do* carry
  imperfect Product+Offer JSON-LD; a working USD calculator at `/kalkulator` ranks; 34×5.0★
  reviews on oink.bg. USA/Canada only.
- **koreatrade.bg** — shrinking (~176→**129** listings). Still zero vehicle schema, no SEO
  plugin, demo-content E-E-A-T damage (fake English team, placeholder email). New: Sofia
  showroom + 2 city pages; blog restarted Nov 2025–Feb 2026 then stalled. Korea-only.
- **carsdirect.bg** **[NEW 2026-07]** — Laravel, Varna, founded 2024. **200,058 live auction
  listings** (~110k of them Korean) with per-listing **landed-cost breakdowns** (incl. their
  €900 fee — strong conversion feature worth matching), 8 country landing pages, `llms.txt`
  („LLM-Friendly: true"), open robots. Weak: Organization-only schema (no Vehicle/Offer/FAQ),
  sitemap hygiene issues, no blog, thin E-E-A-T, grey-hat mobile.bg/cars.bg brand-jacking pages
  (spam-action risk — do not copy).
- **usacars.bg** **[NEW 2026-07]** — Next.js mirror of the US auction feed at absurd scale
  (**~19.7M** `/car/` URLs in 3,948 sitemaps) with Car JSON-LD, but the rest of the site is
  gutted (about/clients/calculator/blog all redirect to home; no contact info in HTML; robots
  blocks every AI crawler except ChatGPT-User). Still ~top-10 for „внос на коли от Америка".
- **plc.auction** **[NEW 2026-07]** — Baltic aggregator, 10-locale hreflang incl. BG, industrial
  programmatic SEO (country/facet/landing pages), server-rendered Vehicle/Product/AggregateOffer
  schema, multi-million-URL archive sitemaps. Ranks top-5 for **both** USA and Korea auction
  queries in BG. Cloudflare-challenges all scripted/AI fetchers; weak E-E-A-T (no people, empty
  ContactPoint, no BG phone); generic translated blog.
- **atlanticexport.eu** **[NEW 2026-07]** — ~33k-lot Copart mirror with online bidding behind a
  sitewide Cloudflare challenge (Bing/DDG index ≈ nothing; AI crawlers blocked via managed
  robots + challenge). Zero schema, no calculator/VIN tool, English filler blog. Ranks ~top-10
  for Canada.

### 2.2 Content/lead-gen sites (thin/no inventory)

- **xclusivecars.bg** **[CHANGED 2026-07, verified]** — still the strongest content competitor,
  actively refreshed („2026" cost/Canada guides). **Schema now exists sitewide** (Rank Math:
  WebSite/Article/BlogPosting; FAQPage on services + some posts; still zero JSON-LD on listings,
  no Vehicle/AggregateRating). Added a **free VIN checker**. Pillars measure ~2,300–2,600 words
  (not ~5,000). Homepage title is still the default „Начална страница - Xclusivecars". The
  Pavel-Kolev partnership is real but tied to a **16.9k-subscriber** channel („Авто Хоби" — not
  the 648k „Pavel Kolev & Icaka") and produces **no measurable authority/demand lift**.
- **koliotamerika.bg** **[CHANGED 2026-07, verified]** — closed its calculator gap (Cost
  Calculator Builder on the cost page) and added a live Copart+IAAI catalog — but the catalog is
  client-rendered with query-param lot URLs, so „no indexable inventory" effectively still
  holds. Added open-policy `llms.txt`. Still the deepest objection-handling content (salvage/
  flood/scams/Carfax/КАТ), named author (Konstantin Alniazi), real US address. USA/Canada only.
- **koreaauto.direct** — now the **most technically advanced competitor**: React SPA behind a
  custom edge-SEO worker serving prerendered snapshots with full JSON-LD (Product+Offer with
  real delivered-EUR prices), fresh 495-URL sitemap, 21 deep Korea articles (Encar guide,
  hidden-fees, GDI/LPI content), calculator + VIN checker + offer comparison + **new parts
  ordering**. GEO stance is now *nuanced*, not self-defeating: blocks **training** bots
  (GPTBot/ClaudeBot/CCBot) but allows PerplexityBot/ChatGPT-User, ships an `llms.txt` with
  preferred-citation URLs, a `Content-Signal` policy, **an MCP server card and a public OpenAPI**.
  Korea-only; no named people; legal entity is a non-profit association (attackable trust angle).
- **wincars.bg** **[CHANGED 2026-07]** — active content machine (posts through Jul 2026):
  25 city pages, **NEW ~40 model×country programmatic pages incl. a Korea hub + 18 „{model} от
  Корея" pages** — head-on into our wedge. Has VIN-history checker, Copart/IAAI catalog search,
  tracking, PDF price lists (baseline missed these). Still **no calculator**, only Yoast-default
  schema, duplicate `<title>` sitewide, contractor gmail exposed as Article author. Server-level
  hard block of GPTBot/ClaudeBot/CCBot (Perplexity allowed), no llms.txt.
- **libertyauto.bg** **[CHANGED 2026-07, verified]** — added a CF7 lead form (baseline „phone
  only" now false), **added Korea as a third country** (June 2026 pillar + posts, already
  visible in proxies), a VIN delivery-tracking subdomain, Yoast `llms.txt`, and a 1,950+-member
  Viber community funnel. Still tiny (~36 URLs), no calculator/VIN checker/inventory, weak
  E-E-A-T ("admin4e" author, no address).
- **importlux.bg** — unchanged/frozen since ~2022 (WP 5.9, one listing, empty blog). Zero threat.
  (13.9k Facebook likes though — social presence outlives the site.)
- **carhunters.bg** **[NEW 2026-07]** — active US/Canada broker: interactive calculator, paid
  Carfax checks, ~470 car pages + 177 make-model programmatic pages (daily-updated sitemaps),
  FAQPage on the money page, named founder. Coordinated on-page refresh June 2026. Dead blog,
  no address, no Korea.
- **karai.bg** **[NEW 2026-07]** — not an importer: a Next.js „AI car marketplace" with the
  best technical schema seen in the niche (FAQPage+Speakable on posts, Dataset, ItemList),
  ~230 programmatic cost pages, 8 tools incl. a VIN check, and 2026-dated „как да внеса кола"
  guides (Germany-centric). Competes for the informational/tool queries, not the service.
- **Others discovered** (mostly thin service sites ranking on head terms): autobidcanada.com
  (dormant since 2020 but ranks; covers Japan), mostauto.bg (broken tech — no sitemap/schema,
  dead inventory module — but 132k Facebook likes + active blog), hdcarscanada.com (theme-demo
  state; served MrCars content once — possible shared infra, watch), driveusabg.com, makauto.eu,
  usacars.bg, fivestarauto.bg (`/carfax` landing), bidexport.com (Angular SPA + BG blog),
  bg.usa-bg.com (Weebly logistics site — weakest page-1 rival), auto21.bg / cars-help.com /
  autoexport-de.com / 7cars.bg / eraauto.bg / ruven-bg.com (the **separate Germany cluster**),
  and the Korea specialist swarm: koreiskikoli.bg (exact-match domain), kj-cars.com,
  megatransauto.com, kolarovcars.com, joseonauto.bg, autogeorge.com, cargologistics-bg.com,
  carsbg11.com, bestauto85.bg.

### Table-stakes (what a credible entrant must have — unchanged, now with additions)
Transliterated Latin slugs · per-country landing pages (USA/Canada/Korea min.) with on-page FAQ · process/steps section · testimonials/Google reviews · blog with cost/customs/VIN guides · Viber group CTA · import-cost calculator + curated/live listings. **New since re-audit:** basic JSON-LD and (increasingly) an `llms.txt` are also table stakes.

### Open gaps selectauto can exploit — re-ranked 2026-07

1. **AI-search citability** — the four biggest inventory competitors (bidmotors, mrcars,
   usacars, plc.auction) + wincars + atlanticexport all block AI crawlers; selectauto is fully
   open with clean titles and citable passages. (koreaauto.direct is the only sophisticated GEO
   rival, and it's Korea-only + blocks ClaudeBot/GPTBot.)
2. **Indexable inventory + model hubs at quality** — carhunters/wincars have small programmatic
   layers; koliotamerika's catalog is invisible to Google; usacars/plc.auction have scale but
   zero E-E-A-T. Nobody combines live indexable inventory, per-model data-driven copy AND trust.
3. **mrcars' persistent self-sabotage** — 404 sitemap + empty titles on exactly its country
   money pages: „внос на коли от САЩ/Корея/Канада" head terms are winnable against it.
4. **Multi-country breadth** — very few competitors credibly cover Korea+USA+Canada together
   (most are Korea-only specialists or USA/Canada-only brokers). Only a genuine multi-source
   importer can publish honest „откъде да внеса — сравнение" decision content — including the
   „Корея или Германия?" objection pillar, since Germany is the country every Bulgarian buyer
   compares against even though we don't serve it.
5. **Cost transparency** — only carsdirect shows landed costs per listing; almost nobody
   publishes worked duty/VAT/ecotax examples with 2026 numbers (euro, FTA origin nuances,
   Red-Sea transit times). Accuracy + freshness beats every competitor quoting stale figures.
6. **VIN/Carfax self-serve** — validated as the **strongest tool demand** (§3); only a few
   competitors have real tools and none targets the winning „vin проверка" phrasing well.
7. **Named-expert E-E-A-T** — still near-universal gap (fake demo teams at koreatrade/
   autobidcanada/hdcarscanada; anonymous authors elsewhere). Real people + reviews + registry
   transparency win trust-sensitive queries in a fraud-scarred niche.
8. **Objection-handling depth per country** — koliotamerika owns it for USA only. Korea
   (mileage authenticity, parts availability, LPI), Canada (US-built ≠ duty-free), Germany
   (odometer fraud, „без ддс" myths) are open.
9. **Encar brand queries** — the „Encar България" SERP is junk (registries, RU sites, one
   koreaauto.direct guide). A definitive Bulgarian Encar guide is a cheap authority asset.
10. **Comparison clusters** — „Корея или Америка", „Канада или САЩ", model X-vs-Y — still
    thinly covered, and only selectauto spans all sourcing countries credibly.

---

## 3. Keyword / intent map — now demand-validated **[CHANGED 2026-07]**

Sources: Google Trends (geo=BG, 5y, web+YouTube, relative values), Google.bg autocomplete
(`hl=bg&gl=bg` — real Google data), DuckDuckGo AC corroboration, Brave `country=bg` SERPs.
Bulgaria is a low-volume market: Trends „0" = below privacy threshold, not literally zero;
autocomplete presence proves nonzero demand. **Absolute volumes still need Keyword Planner.**

**Demand ranking (relative, cross-anchored):** `vin проверка` (avg 10.1, **4× growth in 2y**,
bigger than „коли от америка" cross-anchored) > `коли от америка` (11.9 in-group, ~2.5× Korea,
steeply rising) > `коли от корея` (3.3, emerged ~2y ago, accelerating; **autocomplete #1**) >
`carfax` (3.3 rising) > `коли от германия` (1.2, differently-phrased intent) > `коли от япония`
(~0 in all 262 weeks).

1. **Transactional head terms**: „внос на коли от **америка**" (primary phrasing — beats „сащ"),
   „внос на коли от корея" (fastest-growing), „внос на коли от канада" (real long tail:
   +калкулатор, +мито, +такси, +осчетоводяване, +мнения; pair as „САЩ и Канада"), „коли от
   аукцион(и)". Germany/Japan head terms are NOT targets (not served — §0.4); those searchers
   are reached through the comparison cluster (§3.6) instead. Emerging: „внос на коли от китай"
   appears in autocomplete — watch it.
2. **Cost / calculator**: generic „калкулатор внос на кола" has **zero measured demand** — the
   demand is country-anchored: „калкулатор за внос на кола от америка/сащ/канада", „калкулатор
   кола от корея". Treat `/kalkulator` as a conversion asset embedded in country hubs + one
   dedicated page targeting the country-anchored phrases; pair with a „Колко струва внос от САЩ
   през 2026" guide (year-dated titles demonstrably win this SERP). „колко струва внос на кола
   от Америка" is the #1 question intent across all clusters.
3. **Process / how-to**: „как се внася кола от Америка", „документи за внос", „колко време
   отнема", „транспорт/доставка". These are the AI-Overview surface (88% of AIO triggers are
   informational) — structure as citable passages.
4. **Trust / verification — the top tool cluster**: target „**vin проверка**" (Latin „vin"
   wins), „проверка по вин номер (**безплатно**)", „**вин проверка корея**" (unserved!),
   „carfax цена / carfax българия / carfax проверка". Head term „проверка на VIN номер" is
   crowded with dedicated VIN affiliates + the free state checker (public-eis.rta.government.bg)
   — go long-tail („проверка на кола от САЩ/Корея по VIN") rather than head-on.
5. **„мнения" is the universal trust modifier** **[NEW 2026-07]**: autocomplete attaches it to
   every country („внос на коли от корея мнения", „кола от германия мнения"…), plus „технотест
   на кола от корея/канада" and „наводнена кола от америка". Build a reviews/objection layer
   per hub — these are the mid-funnel queries real buyers type.
6. **Source comparisons**: „Корея или Америка", „Канада или САЩ", „кола от германия или италия"
   (autocomplete-confirmed), „корейски коли на газ / LPI" (proven angle — koreaauto.direct's
   LPG category + a dead parked domain still rank; „газ течна фаза" education is open).
7. **Make/model + source long-tail** (programmatic, shipped): „{Марка} {Модел} внос от
   {Държава}", „{Модел} на газ/LPI". Prioritize models with proven local demand: Tucson (+42%
   used registrations), Sportage (+41%), Sorento, Santa Fe, K5, Grandeur (LPI), Jeep Grand
   Cherokee (+48%, classic USA import), plus the German volume models (Golf, Passat, C/E-Class).
8. **Branded / auction**: „Copart какво е", „Copart или IAAI", auction-terms glossary (as-is,
   run&drive, clean/salvage/rebuilt/flood title), „Encar" (see §2 gap 9), „Manheim". Note
   Canada's Impact Auto is now **IAA Canada** — use both names.
9. **Local / КАТ / legal / 2026 regulatory** (calculator + content accuracy pack — all verified
   against primary sources 2026-07):
   - **Euro**: BGN→EUR since 2026-01-01 at fixed **1.95583**; dual price display mandatory until
     2026-08-08 (show exact-rate BGN equivalents; „цена в лева" queries persist).
   - **USA/Canada duty**: 10% MFN on CIF; **20% VAT on (CIF + duty)** — cite customs.bg.
   - **Korea**: 0% under EU–KR FTA **only with an origin declaration from a Korean
     approved-exporter** (mandatory >€6,000; no importer's-knowledge route). Auction cars
     without it pay 10%. → calculator toggle + differentiator article („защо някои коли от
     Корея плащат 10% мито").
   - **Canada catch**: CETA 0% since 2024 **only for Canadian-origin** cars — a US-built car
     bought at a Canadian auction pays 10%. Myth-busting content competitors get wrong.
   - **Екотакса**: in-force M1 ICE bands 125/194/290/310 лв by age (hybrids less; ПМС 76/2016
     изм. 2018). A ~24% increase was drafted mid-2025 — **promulgation unconfirmed; re-verify
     in Държавен вестник before hard-coding**. Model as config with a „last verified" date.
   - **Homologation (US cars)**: individual approval via ИААА ~€256–511 + ECE headlights, rear
     fog, km/h speedometer (€150–1,500+), ГТП, KAT fees — itemize in the calculator.
   - **Transit times 2026**: Korea→BG realistically **~2 months** (Cape of Good Hope diversions
     persist; competitors quoting 30–45 days are beatable on accuracy); USA→EU 4–7 weeks
     door-to-port (Atlantic unaffected) — a genuinely fresh „САЩ е по-бърз от Корея" comparison
     angle. Germany facts (no duty, days-long delivery, odometer-fraud risk) are inputs to the
     „Корея или Германия?" objection pillar, not to a service page.
10. **Hybrid/EV cluster** **[NEW 2026-07]**: Bulgaria leads the EU in hybrid-sales growth;
    hybrids are the fastest-growing used segment; Korea's „green" used exports +200% (2025).
    „хибрид от Корея", used-EV battery/range questions — differentiated sub-topic competitors
    barely cover.
11. **City modifiers**: standalone „внос на коли {град}" demand ≈ 0; real demand is
    **country+city** („внос на коли от корея варна/софия/бургас/пловдив/стара загора"). See
    §4.2 — generic city pages are scrapped.

**FAQ / AI-citable targets** (visible Q&A passages; see §5 for why not „FAQ rich results"):
„Колко струва внос на кола от Америка?" · „Колко време отнема?" (with honest 2026 transit
times) · „Какво мито и ДДС се плаща?" (+ Korea/Canada origin nuances) · „Какви документи са
нужни?" · „САЩ или Канада?" · „Реални ли са километрите на колите от Корея?" · „Има ли части
за корейските коли в България?" · „Какво е Carfax/Encar?" · „Какво е salvage/flood title?" ·
„Какво е екотакса?" · „Как се регистрира в КАТ / какво е индивидуално одобряване?" — the Korea
questions are lifted from actual SERP FAQ features observed on Brave.

---

## 4. Recommended SEO site architecture

### 4.1 URL strategy (decision — as-built reconciliation **[CHANGED 2026-07]**)
- **Standardize on transliterated Latin slugs** — shipped.
- One canonical home for each concept — shipped in the rebuild (legacy duplicates remain a
  migration task).
- **As-built URLs won** and are documented in [11 §2](11-web-seo-and-indexing.md): catalog =
  `/vsichki-avtomobili` (not `/avtomobili/`), listing = `/avtomobil/{id}` (numeric id, no
  descriptive slug), hubs = `/avtomobili/marka/{make}/{model}`. The descriptive-slug listing
  URL from the original plan was dropped; revisit only if CTR data ever justifies a migration —
  do **not** churn URLs now.

### 4.2 Top-level information architecture (updated)

```
/ (home — value prop + calculator teaser + featured listings + LINKS TO HUBS ← currently missing)
│
├── COUNTRY PAGES (pillar + visible FAQ + calculator instance + trust + live listings)
│   ├── /vnos-na-koli-ot-korea/         ← FLAGSHIP (demand-validated; contested — win on depth)   [SHIPPED — needs 2–3k words, testimonials]
│   ├── /vnos-na-koli-ot-sasht/         ← CO-PRIMARY (largest demand pool; „америка" phrasing;
│   │                                      trust/fraud objection content mandatory)                [SHIPPED — same]
│   └── /vnos-na-koli-ot-kanada/        (pair with САЩ; CETA origin myth-busting)                  [SHIPPED — same]
│       (Japan/Germany country pages CUT — not served by the business. Their residual
│        search demand is captured by blog comparison content instead: „Корея или
│        Германия?" objection pillar + „Защо не от Япония" explainer → funnel to Korea.)
│
├── INVENTORY (programmatic, auction-fed)                                                          [SHIPPED]
│   ├── /vsichki-avtomobili             (catalog; faceted variants canonicalize to bare URL)
│   ├── /avtomobili/marka/{make}/       (brand hub)
│   ├── /avtomobili/marka/{make}/{model}/   (model hub — thin-content guard ≥3 live listings)
│   └── /avtomobil/{id}                 (listing; sold → noindex,follow → 410 при 90d)
│
├── TOOLS (conversion assets; SEO via country-anchored phrases)
│   ├── /kalkulator/                    [SHIPPED — Phase-0 estimator] → upgrade: itemized
│   │                                    line-items, Korea origin-declaration duty toggle,
│   │                                    Canada CETA-origin default, ecotax bands (config +
│   │                                    „last verified" date), realistic transit times,
│   │                                    gated-PDF lead capture (markets stay KR/US/CA)
│   ├── /proverka-vin/                  [SHIPPED] → retarget copy to „vin проверка"/„безплатно";
│   │                                    add „вин проверка корея" angle; /carfax feeds brand
│   │                                    demand („carfax цена/българия")
│   └── /sravni-oferti/                 (optional; koreaauto-style offer comparison)               [PENDING/OPTIONAL]
│
├── TRUST / CONVERSION                                                                             [SHIPPED except bios]
│   ├── /proces/ · /otzivi/ · /za-nas/ (+ NAMED experts/bios ← still missing) ·
│   ├── /chesto-zadavani-vaprosi/ (visible Q&A hub) · /kontakti/ (LocalBusiness, NAP)
│
├── /blog/  (topical authority — clusters 3.3–3.10)                                               [PENDING — biggest content gap]
│   ├── cost guides (year-dated, „2026" in title — proven CTR/freshness win in this SERP)
│   ├── trust/objection per country (salvage/flood/scams/мнения/технотест; Korea mileage+parts)
│   ├── comparisons (Корея vs Америка, Канада vs САЩ, model X vs Y, PLUS the two pages that
│   │    replace the cut country hubs: „Корея или Германия?" objection pillar and „Защо не
│   │    внасяме от Япония" explainer — both funnel to the Korea/USA hubs)
│   ├── auction explainers (Copart vs IAAI, глосар, Encar guide, Manheim, IAA Canada)
│   └── regulatory/КАТ/еко-такса/хомологация (year-stamped, quarterly re-verification loop)
│
└── City pages: SCRAPPED as standalone **[CHANGED 2026-07]** — demand is only country+city.
    Serve via country-hub sections/FAQ („Доставка до Варна/Пловдив/София…") or build later
    ONLY with genuinely local substance (scaled-content/doorway risk is real — §5 policy note).
```

### 4.3 Page templates

**Country hub** (e.g. `/vnos-na-koli-ot-korea/`) — structure shipped; content depth pending:
- H1 „Внос на коли от Корея" · **2,000–3,000 words** (currently ~600–900 — the main shortfall)
- Why this country (Korea: LPI/газ, equipment, Encar trust, mileage authenticity; Canada: low
  rust + the CETA origin catch; USA: volume/price + title-type transparency)
- Embedded **calculator instance** preset to the country (shipped) · process steps (shipped)
- Cost breakdown table with **2026-verified numbers** + „последна проверка" date
- Trust/verification section + **testimonials block** (missing) · 6–12 featured live listings
  (shipped, 8) · visible FAQ block (shipped) · CTA form (shipped)
- Internal links → model hubs, blog pillars, comparison pages · **city-modifier section**
  („Доставяме в София, Пловдив, Варна, Бургас…" with real logistics facts)

**Model hub** (programmatic) — shipped with data-driven copy (real aggregates: price band, year
range, source country, buy-now count) + ≥3-listing index guard. This satisfies the
scaled-content policy: pages are backed by proprietary live inventory, not template spam.

**Individual listing** (`/avtomobil/{id}`) — shipped: price shown, Car(Vehicle/Product)+Offer +
BreadcrumbList, sold → Offer suppressed + noindex → 410. Pending polish: masked VIN visible
on-page (currently JSON-LD only), title enrichment (price/fuel/„внос от {държава}" — competitors'
listing titles are uniformly thin, an easy CTR edge).

---

## 5. Schema.org plan — reframed **[CHANGED 2026-07]**

**What changed:** (a) competitors closed the schema gap (§2), (b) Google killed the relevant
rich results, (c) evidence says JSON-LD is not what AI engines read.

Verified feature status (Google Search Status Dashboard / official docs):
- **FAQ rich results: dead for everyone since 2026-05-07** (already gov/health-only since
  Aug 2023; Search Console/Rich Results Test support removed June 2026).
- **HowTo rich results: dead since Sept 2023.** Do not add HowTo markup.
- **Vehicle-listing structured data + the organic vehicle listings program: deprecated June
  2025 / sunset** — and it was US-only anyway; Bulgaria was never eligible (nor for paid
  Vehicle Ads). [11 §6](11-web-seo-and-indexing.md) already reflects this.
- The „Dec 2025 E-E-A-T update" this doc previously cited was actually the **December 2025
  core update**; the E-E-A-T framing is third-party interpretation. The practical advice
  (named authors, first-hand import experience, original photos) stands — re-sourced to
  evergreen core-update guidance. Confirmed updates Dec 2025–Jul 2026: Dec 2025 core, Feb 2026
  Discover, Mar 2026 spam + core, May 2026 core, Jun 2026 spam.
- **AI engines read visible HTML, not JSON-LD** (no measured correlation between schema and AI
  citations; Google says no special markup for AIO). Schema's remaining value: product
  snippets, entity understanding, Bing/Copilot (Bing confirmed schema helps there).

**Therefore:** keep the shipped stack (it's correct), stop expecting rich-result/AI-citation
miracles from it, and put the marginal effort into **visible content**:

| Page type | Schema (shipped ✅ / planned) | Note |
|---|---|---|
| Site-wide | ✅ `AutoDealer`/`Organization` + `WebSite`+`SearchAction` | add `sameAs` to owned profiles (brand disambiguation, §2.0) |
| Listings | ✅ `Car`⊂`Vehicle`⊂`Product` + `Offer`, `BreadcrumbList` | product-snippet eligible; breadcrumb display is desktop-only now |
| Hubs/catalog | ✅ `ItemList` (URL list), `BreadcrumbList`, data-driven copy | ItemList-of-URLs is fine; per-car nodes live on detail pages |
| Country hubs / FAQ hub / tools | ✅ `FAQPage` | **optional hygiene** — no SERP feature exists; the visible Q&A is what matters |
| Reviews `/otzivi` | ✅ none (BreadcrumbList only) — **intentional** | self-serving-review markup is ineligible/manual-action risk; render reviews as content |
| Blog posts (pending) | `Article`/`BlogPosting` + named `author` `Person` | the E-E-A-T carrier; consider `Speakable` (karai.bg pattern) |
| Contact | ✅ `LocalBusiness` (geo, hours, priceRange) | |

**Programmatic-policy note** (verified): the relevant risk policies for make/model and any
future city pages are **scaled content abuse** and **doorway pages** (not „site reputation
abuse", which covers third-party parasite content). Model hubs backed by real inventory +
index guards = low risk (shipped). Pure-template city pages = high risk (hence scrapped, §4.2).
Avoid ranking-driven guest placements on BG media domains (that *is* site-reputation-abuse
territory).

---

## 6. GEO / AI-search — re-weighted **[CHANGED 2026-07]**

**Facts (verified July 2026):** AI Overviews live in **Bulgaria + Bulgarian** since May 2025
(Google's availability doc, Wayback-bracketed); **AI Mode** live too (country Oct 2025,
Bulgarian ~Feb 2026). Google = 96.2% of BG search (97.9% mobile; devices 58% mobile). GenAI
adoption in BG is low overall (22.5%, 3rd-lowest EU) but 50% among 16–24s; no measurable
Perplexity/ChatGPT footprint in BG traffic data. AIO citations increasingly come from *outside*
the top-10 (query fan-out: 76%→38% of citations from top-10 between 2025 and 2026) — the bar
for a new site is lower than classic SEO. ~88% of AIO-triggering queries are informational.

**Priorities:**
1. **Google AIO/AI Mode is the game** — and inclusion rides on **normal Googlebot indexing**
   (Google-Extended only gates Gemini training). Ordinary indexability + passage-structured
   Bulgarian content is the real GEO lever.
2. **Citable passages over markup**: question as H2/H3 + 2–4-sentence self-contained factual
   answer, on process/cost/trust topics (the informational slice). Listing pages won't earn
   AIO citations; guides will.
3. **Keep the open-crawler posture** (shipped in `robots.ts`) — it's near-free and most big
   competitors block. This is the ChatGPT/Perplexity option value, growing with the 16–24 cohort.
4. **llms.txt: keep, don't invest.** No major AI system consumes it (Mueller/Illyes; server-log
   evidence). One maintenance task remains: **refresh `public/llms.txt`** — it currently omits
   the country hubs, `/kalkulator`, `/proverka-vin`, FAQ hub and `/otzivi` (the money pages).
   No llms-full.txt, no per-page .md variants.
5. **YouTube presence** **[NEW]** — brand mentions on YouTube are the strongest measured AIO-
   visibility correlate, and this niche's demand is literally being built there (7CARS' weekly
   Korea series, 127k subs; single import videos reach 45k–221k views — more than the entire
   monthly search volume for these queries). Importer-owned channels demonstrably fail (45–3.7k
   subs) — **partner with established creators** (AvtoNonchev, ГаражЪ-tier, Кентавър Авто)
   instead of building from zero.
6. Clean populated titles/meta everywhere (shipped) — don't repeat mrcars' empty money-page
   titles or the legacy site's broken title template.
7. **Follow-up (manual):** spot-check ~10 import queries on google.bg in a real browser for AIO
   trigger rates + citations; nobody has yet tested what AI engines actually cite in this niche
   (the one research gap left unfilled).

---

## 7. Internal linking

- Home → country hubs + calculator + featured listings.
  **⚠ As of 2026-07 the primary nav/footer link NONE of: country hubs, `/proverka-vin`, FAQ
  hub, `/otzivi` (only `/kalkulator` has a single footer link), and the homepage links only to
  the filtered catalog. Wiring these is the single cheapest SEO task in the backlog.**
- Country hub ↔ its model hubs ↔ individual listings (breadcrumb + contextual) — shipped.
- Blog pillars → country hubs & calculator (transactional pages get the equity) — pending blog.
- Comparison posts → both relevant country hubs.
- Calculator & VIN tool linked site-wide (header/footer) as conversion anchors.
- The winning SERP pattern (wincars, koliotamerika hold 3 top-15 slots each) is **pillar page +
  2–3 supporting articles interlinked** — replicate per country.

---

## 8. Prioritized roadmap — updated 2026-07

**Phase A — wiring & accuracy (days) — do first, near-zero cost**
- Add country hubs, calculator, VIN tool, FAQ hub, reviews to header/footer nav; link hubs from home (§7).
- Refresh `public/llms.txt` with the money pages (§6.4).
- Add canonical + OG to `/za-nas`, `/carfax`, `/proces`.
- Listing-title enrichment (price/fuel/source) + visible masked VIN on listings.
- Organization `sameAs` + Google Business Profile + „отзиви" brand assets (§2.0 disambiguation).
- Legacy WP site: **decision 2026-07 — WordPress removed entirely at cutover**. A redirect/410
  cutover map was built then **removed 2026-07-18** at the owner's request (old site gone, ~zero
  equity/backlinks) — old legacy URLs now 404. See
  [13-seo-action-plan.md](13-seo-action-plan.md) Phase 0.

**Phase B — money-page depth (weeks 1–6) — primary goal: leads**
- Deepen Korea/USA/Canada hubs to 2,000–3,000 words with the 2026-verified cost/regulatory pack
  (§3.9), testimonials block, city-modifier sections, „мнения"/objection content.
- Calculator v2: itemized line-items, Korea **origin-declaration duty toggle**, Canada
  10%-default with CETA note, ecotax age bands as config + „last verified" date, realistic 2026
  transit times, gated-PDF lead capture, add DE/JP markets.
- VIN tool SEO retarget („vin проверка", „безплатно", „вин проверка корея"); `/carfax` page
  targets brand demand („carfax цена/българия").
- „Корея или Германия?" objection pillar + „Защо не внасяме от Япония" explainer (the
  comparison content that replaces the cut Japan/Germany pages — §0.4, §4.2).

**Phase C — authority & content clusters (weeks 4–16, overlaps)**
- Ship `/blog` + Article schema + named-author bios (also fixes the /za-nas E-E-A-T gap).
- Cluster order by demand: (1) USA/Canada cost+trust (largest pool, fraud narrative),
  (2) Korea (Encar guide, LPI/газ, mileage/parts FAQs, hidden fees, „2 месеца доставка" honesty),
  (3) comparisons (Корея vs Америка first), (4) auction explainers/glossary, (5) КАТ/екотакса/
  хомологация guides, (6) hybrid/EV-from-Korea. Year-date titles; quarterly regulatory
  re-verification loop with visible „last updated".
- Link/PR/brand track (12–24 months, aimed at bidmotors-held head terms): digital PR around
  newsjackable moments (EPPO fraud coverage → „how to verify history", euro
  transition), niche directories/profiles, creator partnerships (§6.5), consider a mobile.bg
  storefront for arrived cars (marketplaces hold most buyer attention — ~60–75% by proxy).

**Phase D — measure & iterate (ongoing)**
- Google Search Console as ground truth (proxies are Brave-index; §10): junk-page removal on
  the old domain, indexation coverage of listings/hubs, query data vs the §3 map.
- One paid SERP-API snapshot (~$50) of the 10 head queries on google.bg before re-weighting
  content budgets; Keyword Planner pull for absolute volumes.
- Manual AIO spot-check + AI-citation test (which domains do Perplexity/Copilot/AIO cite for
  „колко струва внос…" — the unfilled research gap).

---

## 9. Success metrics — updated **[CHANGED 2026-07]**

- Indexed-page health (GSC): listings/hubs indexed without bloat; sold lots pruned; legacy junk
  removed from Google.
- Rankings (Google.bg, not proxies): Korea + „америка" head terms, „колко струва" cost queries,
  „vin проверка" cluster, model long-tail. Baseline 2026-07: **selectauto.bg appears in zero
  top-20s, including its own brand query.** First milestones: outrank the zero-authority cohort
  (koreatrade, importlux, usa-bg, hdcarscanada, autobidcanada), then mrcars' empty-title
  `/import/*` pages, then the mid-tier (wincars/xclusivecars/koliotamerika/carhunters).
- ~~FAQ rich results, vehicle results~~ **removed — features no longer exist.** Realistic SERP
  features: product snippets on listings, sitelinks, brand panel.
- AI citations: brand mentions/citations in AI Overviews / AI Mode / ChatGPT / Perplexity for
  process+cost queries (manual spot-checks until measurable).
- Branded search demand (Trends geo=BG) — currently zero; any sustained nonzero is progress.
  Watch bidmotors (10.3 avg) as the ceiling benchmark.
- Conversions: calculator completions + gated-PDF leads, VIN-check submissions, Carfax requests,
  inquiry-form leads — segmented by entry page (hub vs blog vs tool).

---

## 10. Method & data caveats (added 2026-07)

- **SERP positions are Brave-index proxies** (`country=bg`), not Google.bg ground truth —
  google.com is JS/consent-walled to every keyless client (verified exhaustively: Startpage
  captcha'd, all 78 public SearXNG instances broken/decoy, CSE 403, DDG/Bing bot-gated). Brave
  and Anthropic WebSearch overlap ~90% (one index family). Autocomplete (`suggestqueries`,
  `hl=bg&gl=bg`) IS real Google data. Ground truth = GSC + one paid SERP-API snapshot.
- **Trends values are relative** (BG is low-volume; „0" = below privacy threshold, and
  autocomplete presence proves nonzero demand). Absolute volumes need Keyword Planner.
- **Ecotax 2026 increase**: draft (~+24%) unconfirmed in Държавен вестник as of 2026-07 —
  re-verify before publishing numbers.
- **Competitor snapshots** are 2026-07-15 point-in-time; the market demonstrably moves in
  ~6-month cycles (schema adoption, Korea land-grab, AI-crawler walls all happened since the
  early-2026 audit). Re-run the competitive sweep ~quarterly.
- Unfilled research gap: what AI answer engines actually cite for BG import queries (output-side
  GEO validation) — scheduled in Phase D.
