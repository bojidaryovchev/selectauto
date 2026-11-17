# Catalog · `/vsichki-avtomobili` (and the grid of the make and model hubs)

- Boards: `ct-catalog`, `ct-filtered`, `ct-past`, `ct-search`, `ct-search-none`, `ct-empty`, `ct-loading`, `ct-pending`
  (each d, t, p); `ct-more`, `ct-prev`, `ct-end` (scrolling, d, t, p); `ct-err-d`, `ct-err-p` (load errors);
  `ct-dd-make`, `ct-dd-model`, `ct-dd-type`, `ct-dd-rest` (dropdowns); `ct-sheet` (phone sheet, flow); `ct-tablet`
  (tablet console, flow); `ct-status` (card statuses, see car-card.md). The design run's notes:
  `D:/design/selectauto/notes/ct.md`.
- Code on main, read in full: `app/vsichki-avtomobili/{page,loading}.tsx`,
  `components/cars/all-cars/{car-filter-bar,all-cars-grid,car-grid-skeleton,card-glass}.tsx`,
  `components/common/combobox.tsx`, `contexts/filter-nav-context.tsx`, `lib/car-filters.ts`, `types/car-filters.type.ts`,
  `queries/cars/{get-car-facets,get-cars-count,get-cars-page}.query.ts`, `mutations/cars/{load-more-cars,load-prev-cars}.action.ts`.
  None of them changed on `main` after the boards were drawn (`git log 2c0aeed..main` is empty for them).
- Strings: `dcanvas regress` on 18.11.2026 finds all 66 strings of these files on the boards; none is missing.
- Checked before building: 18.11.2026 · Walked after building: 18.11.2026, on the local build against the live data
  (GET only, plus the read-only `loadMoreCars`, `loadPrevCars` and `getMyFavoriteIds`): screenshots at 320, 390, 820,
  1024, 1440, 1920 and 2560 px compared with the boards; the sheet, the dropdowns, pending, both load errors and the
  loading skeleton (on a throttled network) photographed; rows 12, 14, 23, 31, 33 and 34 exercised by script (clearing
  keeps the tab, typing then picking keeps both, the past tab lists 138 makes against 142, the empty state's reset, the
  make hub's grid, the sheet's live count, Esc and badge). The grid's columns follow the CSS at every width: 1 up to
  640 px, 2 at 820, 3 at 1024 and 1280, 4 at 1440, 5 at 1920, 6 at 2560.

| # | What the code does today (file:line) | On the board | Outcome |
|---|---|---|---|
| 1 | Metadata, active: „Всички автомобили \| SelectAuto", description „Разгледай всички автомобили … за теб …", canonical to the bare URL, social tags (page.tsx:37-50) | not drawn (metadata) | Description in formal address (decision 1): „Разгледайте … за вас …", as the design run proposed |
| 2 | Metadata, past: „Приключили търгове \| SelectAuto", its description, `noindex, follow`, canonical to the bare URL (page.tsx:26-35) | not drawn | — |
| 3 | h1 „Всички автомобили" / „Приключили търгове", capitals through CSS (page.tsx:127-129) | `type-h1`, as written | Sentence case (decision 10) |
| 4 | Past: „Реализирани цени от приключили търгове — за справка. Тези автомобили вече не са активни." (page.tsx:130-134) | lead paragraph · `ct-past` | — |
| 5 | ItemList JSON-LD of the first page, active view only (page.tsx:109-124) | not drawn | Kept |
| 6 | Results line, an h2: „Намерени автомобили: N" / „Намерени резултати: N" (past) / „Резултати от търсенето" (search, no count); N grouped as bg-BG writes it (page.tsx:147-154) | yes; the number in the display face | — |
| 7 | Filter changes are soft navigations (`router.replace`, no scroll); while one runs, each old card is frosted and can't be clicked (filter-nav-context.tsx:62-68, all-cars-grid.tsx:541) | frosted cards and a spinner beside the count · `ct-pending` | Spinner added as drawn (design run, Q1) |
| 8 | `loading.tsx`: skeleton title, console block, count bar and 12 skeleton cards | the same, each shaped like its control · `ct-loading` | — |
| 9 | Активни / Приключили switch; switching to the past drops the auction window (car-filter-bar.tsx:158-171, 112) | segmented control; on a phone it stays on the page above „Филтри" | — |
| 10 | „Изчисти филтрите", disabled with nothing set, with a count badge (car-filter-bar.tsx:172-183) | „Изчистете филтрите", badge | Formal address |
| 11 | The badge counts the Приключили tab as a filter (car-filter-bar.tsx:152; REDESIGN.md, bugs) | not counted · `ct-past`, `ct-search-none` | Fixed |
| 12 | „Изчисти" also switches back to Активни (`navigate("?")`, car-filter-bar.tsx:136-140) | open in the design run | Fixed with 11: the tab is not a filter, so clearing keeps it. A call made during the rebuild, listed in REDESIGN.md for the owner |
| 13 | Lot № / VIN search: label „Търсене по лот № / VIN", placeholder „Въведи лот номер или VIN…", applied 1.5 s after typing stops, the grid frosted meanwhile (car-filter-bar.tsx:188-197, 125-133) | search icon in the field, the value in mono · placeholder „Въведете лот номер или VIN…" | Formal address |
| 14 | Typing in a text field, then a dropdown, pill or tab within 1.5 s: the delayed text apply fires afterwards with the filters as they were when typing, and undoes the click (car-filter-bar.tsx:117-133, found 18.11.2026) | not drawn | Fixed: an instant change takes the typed text with it and cancels the delayed apply |
| 15 | Марка: „Всички марки" + makes, search „Търсене на марка…"; picking one clears Модел (car-filter-bar.tsx:201-210, 109) | logo plates in the list and in the field · `ct-dd-make`, `ct-pending` | Plates added (decision 8) |
| 16 | Модел: disabled until a make is chosen, „Първо избери марка" / „Всички модели", search „Търсене на модел…" (car-filter-bar.tsx:211-224) | `ct-dd-model`; „Първо изберете марка" | Formal address |
| 17 | Тип: „Всички типове" + types with counts „Джип (SUV) (366579)"; a zero count is disabled unless chosen (car-filter-bar.tsx:225-243, combobox.tsx:145) | the count right-aligned and grouped („366 579"; 4 digits ungrouped) · `ct-dd-type` | Format as drawn |
| 18 | Цена от ($) „0", Цена до ($) „∞", Година от „1990", Година до „2027": numeric fields, applied after 1.5 s (car-filter-bar.tsx:247-292) | yes; in pairs in the phone sheet | — |
| 19 | Пазар: Всички (the spinning globe), Корея, САЩ, Канада (flags) (car-filter-bar.tsx:15-20, 296-321) | segmented control; 2×2 chips in the sheet | — |
| 20 | „Само с Buy Now" checkbox (car-filter-bar.tsx:323-331) | a switch with the same label | Control as drawn |
| 21 | Търг: Всички, С насрочен търг, Днес, 24 часа, До 3 дни, До 7 дни; hidden on the past tab (car-filter-bar.tsx:28-35, 336-354) | chips · `ct-past` hides them | — |
| 22 | Гориво (counts, zero disabled), Задвижване, Състояние („Всички състояния", counts, zero disabled), Цвят („Всички цветове") (car-filter-bar.tsx:357-412) | yes · `ct-dd-rest` | — |
| 23 | The past tab's dropdowns and counts come from the active cars (get-car-facets.query.ts:26; REDESIGN.md, bugs) | not drawn | Fixed: the past tab reads the past rows of the same summary |
| 24 | Counts are live (leave-one-out) only once a selective filter is set (get-car-facets.query.ts:137-141) | yes | — |
| 25 | When the facet query fails, every list holds only its „Всички …" row (get-car-facets.query.ts:142-148) | `ct-dd-rest`, Марка | — |
| 26 | Dropdowns: search only above 8 options; „Търсене…" by default; „Няма резултати"; a tick on the chosen row; named by their label; above the header (combobox.tsx) | `.sa-pop`: search with an icon, tick, highlighted row, opens above the field when there's no room below · `ct-tablet` | Kit look (decision 4) |
| 27 | Controls follow the URL on back and forward (car-filter-bar.tsx:88-93) | — | Kept |
| 28 | Grid: 1 to 4 columns at 560, 1024 and 1280 px; 20 px gap (all-cars-grid.tsx:16-23) | columns of at least 280 px: 4 at 1440, 5 at 1920, 6 at 2560 | As drawn (README, layout) |
| 29 | Infinite scroll both ways (`loadMoreCars`, `loadPrevCars`), a page of skeletons below, reserved rows above a shared `?after=` link, uniform rows, `?after=` kept current while scrolling, reload defence (all-cars-grid.tsx) | `ct-more`, `ct-prev`, `ct-end` | Kept as built; no end marker (design run, Q3) |
| 30 | A failed page load is silent and retried on the next scroll (all-cars-grid.tsx:371-372, 404-405; REDESIGN.md, bugs) | „Възникна грешка. Опитайте отново." and „Опитайте отново" in place · `ct-err-d`, `ct-err-p` | Fixed. Both strings are the formal form of today's (decision 1) |
| 31 | No results: „Няма налични коли по избраните филтри." (all-cars-grid.tsx:543-552) | the same, with a search icon and „Изчистете филтрите" · `ct-empty`, `ct-search-none` | The button added as drawn (design run, Q4): the same reset as in the console |
| 32 | The server renders the first page as a plain grid (crawlers, LCP); the first two photos load eagerly (all-cars-grid.tsx:558-574) | — | Kept |
| 33 | The make and model hubs use the same grid without the filter bar (`avtomobili/marka/[make]`, `[model]`) | their own boards, a later step | The grid change reaches them; no reset button there |
| 34 | Phones: the filter block sits on the page, „Още филтри" is mentioned in a comment but no longer exists | the console folds into „Филтри" with the badge; a full-height sheet holds every filter; „Изчистете филтрите" and ✕ „Затворете" in its header; the bottom button „Вижте N автомобила" („Вижте 1 автомобил", „Вижте резултатите" for a search, a spinner while it updates) closes it · `ct-sheet` | As drawn (decision 5). The sheet's strings are new, listed for the owner |
| 35 | Tablets: the same block | Марка and Модел, then Тип and the four numbers, then the other four 2×2 · `ct-tablet` | As drawn |
| 36 | Accessible names: the dropdowns carry their label; the card's links, heart, phone and Viber (car-card.md) | the sheet is a dialog named „Филтри" | — |

Nothing on the screen writes data: the page and both actions only read.
