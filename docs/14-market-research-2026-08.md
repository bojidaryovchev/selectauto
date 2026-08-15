# 14 — Market Research, August 2026 (first real-data snapshot)

> **What this is.** The Phase D "ground truth" pull that [13-seo-action-plan.md](13-seo-action-plan.md)
> scheduled and never had: **absolute Bulgarian search volumes**, **real Google.bg SERPs**,
> **real competitor traffic**, and **real backlink profiles** — pulled 2026-08-07 via the
> OpenSEO MCP (DataForSEO), `locationCode=2100` (Bulgaria), `languageCode=bg`.
>
> [12-web-seo-strategy.md](12-web-seo-strategy.md) §10 states plainly that its rankings were
> **Brave-index proxies** and its demand data was **relative Google Trends**. This doc replaces
> those proxies with measurements. Where the proxy-era conclusions were wrong, §7 says so.
>
> OpenSEO project: `965b7d23-5866-4600-9d6b-30a2812dd4ee`. Cost: 630 credits.

---

## 1. Where we stand — the one-paragraph answer

The site is **built well and distributed not at all.** Content depth, schema, titles, hubs,
robots and AI-crawler posture are all genuinely good — better than most of the market. But
selectauto.bg has **60 estimated organic visits/month**, ranks for **56 keywords with zero
top-10 positions** (median position **42**), has **no backlink record whatsoever**, **no Google
Business Profile**, and **no branded search demand**. It appears in **zero** of the top-10s for
the ten head queries in this niche. Meanwhile every URL in every sitemap is a **308 redirect**,
because the site declares the apex host as canonical while serving from `www`.

The gap to the leaders is **~113×** (wincars) to **~199×** (7cars) in organic traffic.

## 2. The numbers

| Metric | selectauto.bg | Source |
|---|---:|---|
| Est. organic traffic / month | **60** | `get_domain_overview` |
| Organic keywords | **56** | `get_ranked_keywords` (totalCount) |
| Keywords in top 10 | **0** | ranked-keyword positions |
| Keywords in top 20 | **5** | best position = 17 |
| Median position | **42** | — |
| Referring domains | **none recorded** | `get_backlinks_overview` → all-null summary |
| Google Business Profile | **none** | `search_local_businesses`, 60 km around Plovdiv → `[]` |
| Branded search volume | **not measurable** | `selectauto` / `select auto` return no volume; `селект ауто` = 50/mo |
| Search Console connected | **no** | `get_search_console_performance` → `not_connected` |

**What the 56 ranking URLs actually are:**

| URL type | Count | Note |
|---|---:|---|
| `/avtomobili/marka/*` (brand + model hubs) | **36** | the programmatic layer works — it is 64% of all our rankings |
| `/vsichki-avtomobili?brand=…&model=…` (faceted) | 7 | indexed despite a correct canonical — see §6.3 |
| **Dead legacy WordPress URLs (now 404)** | **11** | see §6.2 |
| `/avtomobil/{id}` (car detail) | 1 | ~945k indexable detail pages produce one ranking keyword |
| `/` | 1 | ranks #42 for "selective cars" |

Two facts worth sitting with: the **model hubs are the only thing working**, and **a fifth of
our remaining Google footprint is pages that return 404**.

## 3. Real demand — absolute BG volumes (replaces the Trends guesses)

Monthly Google searches in Bulgaria. `KD` = keyword difficulty (0–100).

### The money cluster — browse intent ("коли от X")

| Keyword | Volume | KD | Intent |
|---|---:|---:|---|
| коли от америка | **3,600** | **2** | informational |
| коли от корея | **1,900** | **0** | informational |
| коли от канада | **1,000** | **0** | informational |
| коли от сащ | 720 | 4 | informational |
| американски коли | 260 | 3 | informational |
| корейски коли | 210 | 0 | informational |
| **cluster total** | **≈7,690** | | |

### The service cluster — transactional ("внос на коли от X")

| Keyword | Volume | KD | Intent |
|---|---:|---:|---|
| внос на коли от америка | 720 | 1 | **commercial** |
| внос на коли от корея | 720 | 0 | **commercial** |
| внос на коли | 260 | 28 | informational |
| внос на коли от канада | 260 | 0 | informational |
| внос на коли от германия | 210 | 8 | informational |
| внос на коли от корея мнения | 210 | 0 | informational |
| внос на коли от сащ | **170** | 0 | **commercial** |
| внос на автомобили от корея | 140 | — | informational |
| внос на автомобили | 90 | 19 | commercial |
| внос на коли от китай | 90 | 3 | informational |
| **cluster total** | **≈2,870** | | |

**Three things this proves:**

1. **The browse cluster is 2.7× the service cluster** and sits at **KD 0–4**. These are not hard
   keywords. Nobody has locked them up with authority — the incumbents rank on age and links,
   not difficulty.
2. **„америка" beats „сащ" 4.2×** on the head term (720 vs 170). Doc 12 called this and was
   right. Our USA hub is titled „Внос на коли от САЩ (Америка)" — the parenthetical is doing
   real work, keep it.
3. **Korea and America are tied** at 720 each on the commercial phrasing. Doc 12's "USA is the
   larger pool" holds for browse intent (3,600 vs 1,900) but **not** for buying intent.

### The tool clusters

| Keyword | Volume | KD | Reality check |
|---|---:|---:|---|
| проверка по вин номер | 1,600 | 13 | SERP owned by the **state registry** (`public-eis.rta.government.bg` #1) + dedicated VIN affiliates |
| vin проверка | 1,300 | 11 | same fortress: vin-info, freevindecoder, carlytics, proverkavin.bg, carvertical |
| проверка на vin номер | 480 | 8 | " |
| вин проверка | 390 | 11 | " |
| carfax | 1,900 | **68** | navigational to carfax.com; CPC €1.76 |
| carfax проверка | 70 | — | |
| **калкулатор за внос…** (all 6 variants) | **no measurable volume** | — | **including every country-anchored variant** |
| колко струва внос на кола от сащ | 10 | — | |

**The calculator has no search demand.** Not the generic phrasing, not the country-anchored
phrasing doc 12 recommended. `/kalkulator`, `/lizingov-kalkulator` and `/byudzheten-kalkulator`
are **conversion assets, not acquisition assets** — keep them, embed them, stop treating them as
traffic plays.

**The VIN cluster is not winnable head-on.** 3,770 combined monthly searches sit behind a
government site and six specialist VIN domains. Doc 12 already said "go long-tail"; the real
SERP says that more strongly than the proxies did.

### Context: the terms that dwarf everything

| Keyword | Volume |
|---|---:|
| cars bg | 673,000 |
| мобиле бг | 550,000 |
| автомобили | 90,500 |
| коли | 22,200 |
| copart | 12,100 |
| iaai | 9,900 |
| коли втора ръка | 9,900 |
| автокъща | 5,400 (KD 9) |
| encar | 4,400 |
| **bidmotors** | **4,400** |

`bidmotors` at 4,400/mo of pure navigational brand demand is the single clearest measure of how
far ahead they are on brand. `автокъща` at 5,400 with **KD 9** is an oddly soft term nobody in
this niche targets.

### Keywords with no measurable BG volume

Worth knowing because **the blog was built on several of them**: `корея или америка`,
`наводнена кола от америка`, `коли на газ от корея`, `документи за внос на кола`,
`регистрация на внесена кола`, `хомологация на автомобил`, `индивидуално одобряване на
автомобил`, `как да внеса кола от сащ`, `salvage title` (30), `copart българия` (10), all
`{model} внос` combinations, and `внос на коли {град}` for every city.

This does not make the blog worthless — those posts are conversion support, objection handling
and AI-citation surface. It does mean **they will not produce traffic**, and the remaining
"model-specific guides" item in doc 13 Phase C should be dropped or re-scoped.

## 4. The real competitive landscape

### 4.1 Organic traffic (measured, not proxied)

| Domain | Traffic/mo | Keywords | What they actually are |
|---|---:|---:|---|
| **7cars.bg** | **11,919** | 576 | General dealer + Korea line, YouTube-brand-led |
| **wincars.bg** | **6,816** | 100 | The USA/Canada head-term winner |
| bidmotors.bg | 3,577 | 151 | Huge inventory + huge brand demand |
| mrcars.bg | 2,196 | 274 | Still self-sabotaging (see §7) |
| koliotamerika.bg | 359 | 34 | Small, but holds the **Knowledge Graph panel** |
| **selectauto.bg** | **60** | **56** | us |

### 4.2 Visibility across the 20 import head terms (`find_serp_competitors`)

| # | Domain | Visibility | Median pos |
|---:|---|---:|---:|
| 1 | **www.facebook.com** | 8.65 | 5 |
| 2 | **wincars.bg** | 7.80 | **1** |
| 3 | bidmotors.bg | 5.05 | 5 |
| 4 | **playcars.mobile.bg** | 5.05 | 3 |
| 5 | usacars.bg | 4.40 | 4 |
| 6 | mrcars.bg | 3.05 | 14 |
| 7 | www.cars.bg | 2.75 | 9 |
| 8 | www.youtube.com | 2.70 | 10 |
| 9 | cars-help.com | 2.60 | 2 |
| 10 | 7cars.bg | 2.40 | 7 |
| … | koliotamerika.bg / north-auto / autogeorge / koreiskikoli | 2.25–2.35 | |
| 23 | xclusivecars.bg | 0.60 | 12 |
| 24 | www.koreaauto.direct | 0.55 | 11 |
| 25 | plc.auction | 0.50 | 14 |
| — | **selectauto.bg** | **absent from all 40** | — |

**Facebook is the #1 competitor in this market.** Business pages rank top-5 on nearly every head
term ("American Dreamcars", "NorthAuto", "Ауто Корея БГ", "Encar.bg"). **A mobile.bg storefront
(`playcars.mobile.bg`) ranks #3** for "внос на коли от америка" — above most dedicated import
sites. `www.cars.bg` storefront pages rank top-10 too.

### 4.3 Who holds what (top-10, real Google.bg)

- **USA / Canada** — identical SERP across „коли от америка / сащ / канада" and „внос на…":
  `wincars.bg` **#1 on all five**, `bidmotors.bg` #2 with a *single* page titled „Внос на коли
  от Америка (САЩ), Канада, Корея и Европа", then playcars.mobile.bg, usacars.bg, mrcars.bg,
  carhunters.bg, Facebook, YouTube, koliotamerika.bg, usaauto.bg.
- **Korea** — a completely different, much softer field: `koreiskikoli.bg` #1 (exact-match
  domain), **`7cars.bg` #1 for „внос на коли от корея"**, mrcars #2–3, then kj-cars,
  kolarovcars, autogeorge, bestauto85, wincars #8, carsdirect #10. **bidmotors is not in the
  Korea top-10 at all.**
- **VIN** — `public-eis.rta.government.bg` #1, then six VIN specialists. No importer ranks.
- **„encar българия"** — the only query of the ten that triggers an **AI Overview**;
  `koreaauto.direct` holds #1 *and* #6 with its „Encar на български" guide.
- **Entity panel** — `koliotamerika.bg` owns the **Knowledge Graph + Google Reviews block** on
  both „коли от америка" (3,600/mo) and „внос на коли от америка". That is what a properly
  configured Google Business Profile buys.

## 5. The link/authority picture — and why it is better news than doc 12 thought

| Domain | Backlinks | Ref. domains | Rank | Spam score | Profile character |
|---|---:|---:|---:|---:|---|
| **selectauto.bg** | **—** | **—** | — | — | **no record at all** |
| **wincars.bg** | 45 | **32** | 18 | 18 | Bulgarian regional news + auto forums |
| bidmotors.bg | 3,793 | 995 | 42 | **41** | bulk directories / bookmarking / guest-post networks |

**wincars.bg is #1 on every USA/Canada head term with 32 referring domains.** Their profile:
`novini247.com`, `dennews.bg`, `toppresa.com`, `petel.bg`, `smartnews.bg`, `travelnews.bg`,
`rousse.info`, `utroruse.com`, `struma.bg`, `pirinsko.com`, `infomreja.bg`, `shum.bg`,
`infoz.bg`, `zovnews.com`, `drumivdumi.com`, `it-rating.bg`, `kadeda.com` — plus
`bmwpower-bg.net`, `vwclub.bg`, `forumnauka.bg` (forums) and `oink.bg` (reviews).

That is a **cheap, replicable, ~3–6 month PR program**, not a 12–24-month authority campaign.
Doc 12's milestone ladder framed the link fight as long and hard because it benchmarked against
bidmotors. Benchmarking against the *actual SERP winner* makes it a much smaller job.

**bidmotors' 995 referring domains are largely low-quality**: `dbsdirectory.com` alone supplies
513 links; the rest is `atsameip.com`, `bizlisting.cloud`, `localcitation.site`,
`guestpostcity.com`, `bookmarkwhirl.com`, `socialytime.com`, `frendvibe.com`, `nichebase.xyz`,
and a `bip{city}.com` directory network. Spam score **41**, with **2,404 broken linked-to
pages**. Do not copy this, and do not treat it as an unassailable moat — it is a spam-update
liability.

## 6. Technical findings on the live site

### 6.1 CRITICAL — every canonical, sitemap URL and OG URL points at a redirecting host

`SITE_URL` in [constants/index.ts:37](../apps/web/src/constants/index.ts#L37) falls back to
`https://selectauto.bg` when `NEXT_PUBLIC_SITE_URL` is unset — and it is unset in production.
But Vercel serves the site on **`www.selectauto.bg`** and **308-redirects the apex**:

```
$ curl -sI https://selectauto.bg/     → HTTP/2 308  location: https://www.selectauto.bg/
$ curl -s  https://www.selectauto.bg/ → <link rel="canonical" href="https://selectauto.bg"/>
                                        <meta property="og:url" content="https://selectauto.bg"/>
```

The site audit measured the consequence: of **120 crawled pages, 119 were 308 redirects**, every
one `isIndexable: false` and every one `inSitemap: true`. Only the `www` homepage returned 200.
The audit's single flagged issue is `canonicalized-page`: *"https://www.selectauto.bg/ →
canonical https://selectauto.bg/"*.

So: **all 20 sitemaps (~945k+ URLs) submit redirecting URLs**, and every served page tells
Google its canonical is a URL that redirects back. Google will resolve it — it has, since the
hubs do rank — but this is unnecessary crawl waste at ~945k-URL scale and it guarantees a
sitemap coverage report full of "Page with redirect".

**Fix:** set `NEXT_PUBLIC_SITE_URL=https://www.selectauto.bg` in Vercel and redeploy. One
env var. (Alternative: flip Vercel to serve the apex and redirect `www` → apex, which makes the
existing default correct.) Note `apps/extension/lib/config.ts:7` already documents `www` as the
canonical host — the web app is the one that disagrees.

### 6.2 Eleven dead legacy URLs are still ranking

Doc 13 Phase 0 removed the legacy redirect map on 2026-07-18 on the premise that the old
WordPress site had "~zero equity". The ranking data disagrees — these still hold positions and
now return **404**:

| Legacy URL | Ranks for | Volume | Pos | Status now |
|---|---|---:|---:|---|
| `/marka/hyundai/` | хюндай | **14,800** | 71 | **404** |
| `/истината-за-колите-от-канада/` | коли от канада | **1,000** | 46 | **404** |
| `/marka/hyundai/?sale_pg=7064` | хюндай върнати от лизинг | 880 | 50 | **404** |
| `/marka/kia/` | kia.bg цени | 260 | 70 | **404** |
| `/auction-car/143310/` | шевролет спарк | 170 | 51 | **404** |
| `/car/{slug}` × 6 | mercedes c class w205, bmw m8 competition, bmw m5 f10, bmw f80, bmw f30 cars, hyundai santa fe 2024 | 390–720 each | 30–59 | 301 → `/vsichki-avtomobili` |

The `/car/*` pattern still redirects (to the bare catalog — a weak target). Everything else
404s. Positions are poor, so the equity is small — but it is **not zero**, it is free, and
restoring a handful of targeted 301s (`/marka/{make}/` → `/avtomobili/marka/{make}`, the Canada
blog post → the Canada hub) costs almost nothing.

### 6.3 Faceted catalog URLs are indexed and cannibalising the model hubs

Seven of our 56 ranking URLs are `/vsichki-avtomobili?brand=…&model=…`. Their canonical is
**correctly** set to the bare `/vsichki-avtomobili` — Google is ignoring it, because the pages
have distinct content and are linked from the homepage.

Root cause: the homepage's popular-brands strip links to **numeric faceted URLs**, not to the
brand hubs:

```
href="/vsichki-avtomobili?brand=58"   ← Hyundai
href="/vsichki-avtomobili?brand=56"   ← Honda
… 18 of them
```

So the strongest internal-link source on the site pushes equity into non-canonical URLs that
carry the generic title „Всички автомобили | SelectAuto" and compete with the very hubs that
produce 64% of our rankings. Brand hubs themselves link correctly down to model hubs.

**Fix:** point the homepage brand strip at `/avtomobili/marka/{make}`.

### 6.4 What is genuinely in good shape

- **Country hubs are real content**: Korea **1,870** Bulgarian words / 13 H2s; USA 1,347 / 10;
  Canada 1,333 / 10 — with substantive sections (0%-vs-10% duty, title types, the CETA myth,
  LPI, parts/service, post-arrival steps, FAQ).
- **Schema is comprehensive and server-rendered**: `AutoDealer`, `WebSite`+`SearchAction`,
  `BreadcrumbList`, `FAQPage`+`Question`/`Answer`, `ItemList`, `Service`, `Country`,
  `LocalBusiness` fields, `WebApplication`+`Offer` on the calculator.
- **Titles and descriptions are populated and differentiated** everywhere checked — the exact
  failure mrcars still has on its money pages.
- **robots.txt explicitly allows all major AI crawlers** and correctly disallows `/api/`,
  `/admin`, auth pages and `/lyubimi`.
- **The audit found no** missing titles, duplicate content, broken links, thin content, missing
  H1s, or heading-order problems.

## 7. Corrections to docs 12 and 13

| Doc 12/13 claim | Measurement | Verdict |
|---|---|---|
| bidmotors is "a runaway tier of one" | **wincars.bg** is #1 on all five USA/Canada head terms (median pos 1); bidmotors is #2 and absent from Korea's top-10 | **Wrong leader.** wincars is the benchmark |
| bidmotors' authority needs a 12–24 month link programme to match | wincars wins with **32 referring domains** of Bulgarian regional PR; bidmotors' 995 domains are spam-scored 41 | **Over-stated.** The real target is ~30–40 quality BG domains |
| wincars is "mid-tier", to be beaten *after* mrcars | wincars: 6,816 traffic, median position 1. mrcars: 2,196, median 14 | **Ladder inverted** |
| xclusivecars is "the strongest content competitor" | visibility 0.60, rank 23 of 40 | **Over-weighted** |
| koreaauto.direct is "the most technically advanced competitor" | true, but visibility 0.55, rank 24 | Technically right, commercially marginal |
| plc.auction "ranks top-5 for both USA and Korea queries" | Korea #7; Canada #33; visibility 0.50 | **Over-stated** |
| „the Encar България SERP is junk — a cheap authority asset" | koreaauto.direct holds #1 **and** #6, and it is the only AIO-triggering query tested | **Closed.** Only 170/mo anyway |
| „vin проверка" is the top demand cluster | коли от америка (3,600) > коли от корея (1,900) > проверка по вин номер (1,600) > vin проверка (1,300) | **Re-ranked** — browse intent is #1 |
| Country-anchored calculator phrases carry the demand | **no measurable volume** on any variant | **Wrong.** Calculator = conversion only |
| The legacy WP site had "~zero equity" — redirects removed | 11 legacy URLs still rank, incl. #71 on a 14,800/mo term; all now 404 | **Not zero** |
| „consider a mobile.bg storefront" (optional, Phase C) | playcars.mobile.bg ranks **#3** for „внос на коли от америка"; cars.bg storefronts also top-10 | **Promote to priority** |
| 7cars = a YouTube channel to partner with | 7cars.bg is the **largest organic site in the niche** (11,919/mo) and **#1 for „внос на коли от корея"** | **Missing competitor**, and proof the YouTube→brand→search path works |
| Facebook not treated as a competitor | Facebook is the **#1 domain by visibility** across the head terms | **Missing channel** |

## 8. What to do, in order

Ordered by (impact ÷ effort). Owners follow doc 13's convention.

### Now — days, near-zero cost

1. `[code]` **Set `NEXT_PUBLIC_SITE_URL=https://www.selectauto.bg`** in Vercel. Unblocks clean
   indexation of ~945k URLs and removes 119/120 redirect-only crawl results. (§6.1)
2. `[user]` **Connect Google Search Console** — free, and it is the only source of first-party
   impression/position data. Currently `not_connected`; doc 13 Phase 0 has had this open since
   July. Submit the (corrected) sitemaps at the same time.
3. `[user]` **Create the Google Business Profile** — Пловдив, ул. Север 64, NAP matching
   `/kontakti`. koliotamerika holds the Knowledge Graph panel on a 3,600/mo query with a site
   one-sixth our size. This is the single highest-value non-code task. (§4.3)
4. `[code]` **Repoint the homepage brand strip** from `/vsichki-avtomobili?brand=NN` to
   `/avtomobili/marka/{make}`. (§6.3)
5. `[code]` **Restore a handful of legacy 301s** — `/marka/{make}/` → brand hub, the Canada blog
   post → `/vnos-na-koli-ot-kanada`, `/car/{slug}` → model hub instead of the bare catalog. (§6.2)

### Next — weeks

6. `[ops]` **A Bulgarian regional-news + forum link programme, benchmarked to wincars' 32
   domains.** Target the exact set in §5 (novini247, petel.bg, dennews, struma, pirinsko,
   infomreja, utroruse, rousse.info…) plus bmwpower-bg.net / vwclub.bg / oink.bg. This is the
   measured price of entry, and we currently have **zero**.
7. `[user]` **mobile.bg and cars.bg storefronts for arrived cars.** A competitor's mobile.bg
   storefront outranks most dedicated import sites on the biggest commercial term. (§4.2)
8. `[user]` **Optimise the Facebook page as a ranking asset**, not just a social profile —
   Facebook is the #1 domain by visibility in this market.
9. `[content]` **Retarget the country hubs at the browse cluster too.** They currently address
   „внос на коли от X" (2,870/mo total); the „коли от X" cluster is 7,690/mo at KD 0–4 and the
   same SERP. Small on-page work — H2s, intro copy, internal anchor text.

### Deprioritise

10. **The calculator as an SEO asset** — no measurable demand on any variant. Keep it as the
    conversion tool it is.
11. **The VIN head terms** — a government registry plus six specialist domains hold 3,770/mo.
    Long-tail only, as doc 12 already concluded.
12. **The remaining doc 13 "model-specific guides"** — every `{model} внос` phrase measured
    zero volume. The model *hubs* already cover this ground and are our best-performing pages.

## 9. Method & caveats

- All figures: DataForSEO via OpenSEO MCP, 2026-08-07, `locationCode=2100`, `languageCode=bg`.
- `organicTraffic` and `etv` are **modelled estimates**, not analytics. Use them comparatively.
- Keyword volumes are Google-Ads-derived averages; close variants are grouped unless clickstream
  refinement is enabled (it was not — it doubles cost).
- Backlink counts come from DataForSEO's index; `null` for selectauto.bg means *no record*,
  which is consistent with doc 12's finding of zero third-party links, but is not proof of
  literally zero.
- SERPs are one point-in-time desktop pull per query. Positions move.
- The site audit crawled 120 pages; because of §6.1 it mostly measured redirects. **Re-run it
  after the `NEXT_PUBLIC_SITE_URL` fix** for a real page-level audit.
- Local-pack data is thin: `get_local_serp_results` for „внос на коли от чужбина" near Plovdiv
  returned no results, which is itself a signal that this niche has little Maps competition.
- Still unfilled: what AI engines actually cite for BG import queries (doc 13 Phase D). Only one
  of ten tested queries („encar българия") triggered an AI Overview at all, which suggests AIO
  exposure in this niche is currently **low** — worth re-testing on informational queries.
