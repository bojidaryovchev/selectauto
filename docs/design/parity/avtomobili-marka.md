# Make and model hubs · `/avtomobili/marka/[make]`, `/avtomobili/marka/[make]/[model]`

- Boards: `hm-make` (d, wide, t, p), `hm-make-thin`, `hm-make-empty`, `hm-model` (d, wide, t, p), `hm-model-thin`,
  `hm-model-empty` (each d, t, p), `hm-hub-loading` (d, t, p), `hm-hub-edge` (fixed); `hm-flow-brand` (the home brand
  tile that opens a make hub). The design run's notes: `D:/design/selectauto/notes/hm.md` §1–§4.
- Code on main, read in full: `app/avtomobili/marka/[make]/page.tsx`, `app/avtomobili/marka/[make]/[model]/page.tsx`,
  `components/cars/model-sold-prices.tsx`, `queries/cars/get-car-hub.query.ts`, `constants` (`MIN_HUB_LISTINGS_TO_INDEX`
  = 3), `queries/cars/get-model-sold-prices.query.ts` (at least 3 sales a year); the grid is the catalog's
  (`all-cars-grid.tsx`, rebuilt with the catalog).
- Checked before building: 18.11.2026 · Walked after building: 18.11.2026, at 1440, 1920, 820 and 390 on today's
  hubs (the board's samples, re-counted read-only): Toyota (105 369 listings, 42 model chips), Renault (4, no models),
  Skoda and Bugatti (0), Toyota Corolla (21 115, 16 sold years), Toyota HiAce (1, no table), Toyota Corona (0); the
  skeleton with JavaScript off. Checked in the browser, GET only: no chip prefetches, a chip opens its model hub, the
  FAQPage JSON-LD equals the visible FAQ, decision 23's sentence is in both, the formal descriptions are in the head.

## What the code does today

| # | What the code does today (file:line) | On the board | Outcome |
|---|---|---|---|
| 1 | Make hubs with at least one listing are prerendered (`generateStaticParams` from the sitemap's makes); others render on demand. Model hubs render on demand | — | Kept |
| 2 | One request-scoped read per page for the slug, the live count and the index count (`loadBrandHub`, `loadModelHub`) | — | Kept |
| 3 | Metadata, make: „{марка} внос от аукцион \| SelectAuto"; „{марка} за внос от Copart, IAAI и Encar — {брой} обяви по модели. Виж цени, филтрирай по модел и заяви оферта за внос от SelectAuto."; canonical from the resolved name; `noindex, follow` under 3 listings in the facets summary (the sitemap's source); share title „{марка} — внос от аукцион" | not drawn (head only) | Decision 1: formal „Вижте цени, филтрирайте по модел и заявете оферта…" (design-run question 4 asked it; decision 1 says everywhere, and the car page's metadata went formal the same way) |
| 4 | Metadata, model: „{марка модел} внос от аукцион \| SelectAuto"; „… — {N обяви}. Виж цени, спецификации и заяви оферта за внос от SelectAuto."; the same canonical and noindex rules | not drawn | Decision 1: „Вижте цени, спецификации и заявете оферта…" |
| 5 | An unknown make or model: a minimal noindex head and the not-found page | `info-404` (another slice) | Kept |
| 6 | JSON-LD: the breadcrumb as shown; the make hub's model links as an ItemList; the model hub's first page of cars as an ItemList and the FAQ as FAQPage (the same strings as the visible FAQ) | — | Kept; the FAQPage follows the visible FAQ, decision 23's sentence included |
| 7 | Breadcrumb „Всички автомобили" / {марка} [/ {марка модел}], the make crumb only when its hub resolves | `sa-crumbs` „Пътечка" | — (the accessible name „Пътечка", decision 12) |
| 8 | H1 „{марка} внос от аукцион" / „{марка модел} внос от аукцион", capitals through CSS | the make's plate (xl) beside the H1, as written | Sentence case (decision 10). The plate is new (decision 8): the logo, two letters without one; from the cached make index |
| 9 | Make intro „… Избери модел по-долу или разгледай всички активни обяви — SelectAuto поема целия внос до регистрация в КАТ." (static, also without models) | the lead, formal | Formal address. That it shows without a „Модели" section is design-run question 6 (a copy change, not made) |
| 10 | Model intro from the model's numbers (`hubIntro`): price band from 300 $ (`MIN_CREDIBLE_PRICE`), years, a country with at least 10 listings and 60 %; the generic text without numbers | the lead; every variant on `hm-hub-edge` | Formal („Вижте…", „Разгледайте…, вижте… и заявете…"). The 300 $ floor in the text is design-run question 7, kept |
| 11 | „Намерени автомобили: {брой}" (a `p` on the make hub, an `h2` on the model hub, over the cards' h3 titles) | the same tags, the number large | — |
| 12 | Make hub: „Модели {марка}" and a chip per model with 3 or more listings, its count beside it, most listings first, linking to the model hub; no route prefetch (a big make has 100+ chips) | chips; on a phone a 3-row swipe | As drawn; nothing removed (design-run question 8); prefetch stays off |
| 13 | No listings: „В момента няма активни обяви за {…}. Заяви персонална селекция и ще намерим подходящ автомобил от аукционите." and „Виж всички автомобили" → `/vsichki-avtomobili` | `hm-make-empty`, `hm-model-empty`: a panel with the car icon and the primary button | Formal address |
| 14 | The results: the catalog's grid for that make (and model), infinite scroll, its own skeleton while the first page streams | `sa-grid` in a band | Kept (the grid is the rebuilt catalog's) |
| 15 | The count says 1 but the grid's first page comes back empty: the grid's own „Няма налични коли по избраните филтри." | `hm-hub-edge`: the sentence in a plain panel | The grid's own empty state from the catalog step (`ct-empty`: the icon and the same sentence; no button without filters) |
| 16 | Model hub: „Реални продажни цени по година" with its paragraph and a table (Година, Средна продажна цена, Продажби; headers in capitals through CSS) when at least 2 years have 3 or more sales | `hm-model`: the table beside the FAQ from 1024 px | Sentence-case headers (decision 10); side by side as drawn |
| 17 | Model hub FAQ, 4 questions, answers built from the model's numbers (`hubFaq`): price (band and median, or generic), source (dominant country or generic), Buy Now (several / one / all / none, verb agreement), import time „Обичайно 6–10 седмици…" | `hm-model*`; every variant on `hm-hub-edge`; two columns when there's no table (`hm-faq--solo`) | Formal („вижте калкулатора", „Използвайте калкулатора", „Заявете персонална селекция…"). Decision 23: the import-time answer gains „При внос от Корея срокът е по-дълъг: реалистично 2–3 месеца от покупката до готовност за регистрация в КАТ.", kept on one line around „по-дълъг" |
| 18 | Loading: crumb, title and intro bars, 12 card skeletons | `hm-hub-loading`: crumb, plate and title, two intro lines, the count, then 2 / 4 / 12 card skeletons by width | As drawn |
| 19 | Page ground light (`bg-[#fafafa]`) | night, the hub header on `s1` | The shell's ground |
