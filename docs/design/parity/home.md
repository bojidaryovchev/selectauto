# Home · `/`

- Boards: `hm-home` (d, t, p, wide), `hm-home-states` (first paint, 3D error, the database-down rails), `hm-flow-hero`,
  `hm-flow-cars`, `hm-flow-brand` (phone flows). The design run's notes: `D:/design/selectauto/notes/hm.md`.
- Code on main, read in full: `app/page.tsx`, `components/three/particle-hero.tsx`,
  `components/home/{why-us,process-cta,popular-brands,final-cta}-section.tsx`,
  `components/cars/{cars-section,cars-carousel,car-cards-carousel,brands-grid}.tsx`, `data/home.ts`,
  `queries/cars/{get-buy-now-cars,get-auction-cars}.query.ts`. None changed on `main` after the boards were drawn.
- Checked before building: 18.11.2026 · Walked after building: 18.11.2026, on the local build against the live data
  (GET only): the page in slices at 390, 820, 1440 and 1920 px against `hm-home`, `-p`, `-t`, `-w`; the 3D error state
  with the scene's data refused; by script, both rails' cars (the Buy Now rail alternates Copart and Encar, no van,
  truck, bus or trailer in either), the track's list semantics, autoplay advancing while on screen, „Напред" at the
  end rewinding and holding autoplay off. The scene's framing below 1024 px was computed from the baked clouds' size
  and checked on captures. The page stays a static shell, revalidated hourly.

| # | What the code does today (file:line) | On the board | Outcome |
|---|---|---|---|
| 1 | Metadata: title, description, canonical, social tags (page.tsx:20-31) | not drawn | — |
| 2 | One visually hidden h1 „Внос на автомобили от Корея, САЩ и Канада — SelectAuto"; the slogan is a `<p>` (page.tsx:50-52) | yes | — |
| 3 | The 3D particle car: three models (COUPE, SEDAN, SUV) morph on a timer, 4,2 s still and 2,2 s morph; drag rotates on desktop, a swipe scrolls on touch; it starts after first paint; a slow or software-rendered device gets one still frame; the scene pauses off screen (particle-hero.tsx) | `hm-home`, `hm-flow-hero`, `hm-home-states` | Kept as built (decision 8). The scene sits in the hero's right half on desktop and under the copy on tablets and phones, as drawn |
| 4 | Slogan „Намираме точните автомобили за точните хора", „точните" in an orange gradient (particle-hero.tsx:477-487) | „точните" in `ortx`, no gradient | As drawn (direction B: no gradients) |
| 5 | Lead „SelectAuto не е просто каталог. …" (particle-hero.tsx:489-493) | yes | — |
| 6 | „Разгледай автомобилите" → `/vsichki-avtomobili`; „Направете запитване" opens the inquiry (particle-hero.tsx:496-509) | primary „Разгледайте автомобилите", secondary „Направете запитване" | Formal address |
| 7 | Model label: „Подбор · Внос · Доставка" (capitals through CSS), the model name and its line; fades out during a morph; „3D ERROR" / „Моделът не успя да се зареди" when the first model fails (particle-hero.tsx:400-401, 514-532) | „Подбор · Внос · Доставка" as written; the eyebrow and dots only from 1024 px | The CSS capitals go (decision 10); the characters stay |
| 8 | Three progress dots, decoration only, hidden up to 900 px (particle-hero.tsx:535-546) | the same, hidden below 1024 px | As drawn |
| 9 | „Защо SelectAuto" and its title and lead; three pillars with icons (why-us-section.tsx, data/home.ts:147-167) | panels with the kit's icons; on a phone the icon sits beside the title | — |
| 10 | „Как работим" card: „Виж целия процес от заявка до ключ", the lead, „Разгледай процеса →" → `/proces` (process-cta-section.tsx) | a band: „Вижте целия процес…", primary „Разгледайте процеса" with an arrow icon | Formal address; the glyph „→" becomes an icon (decision 10) |
| 11 | Buy Now rail: „Buy Now автомобили", „Налични предложения, които можеш да вземеш сега", the lead, 6 cards, „Виж всички Buy Now" → `/vsichki-avtomobili?channel=buy-now` (page.tsx:60-67) | „…които можете да вземете сега", „Вижте всички Buy Now" beside the arrows (on a phone under the rail) | Formal address; layout as drawn |
| 12 | Buy Now rail content: the 6 newest Buy Now listings with a photo, any source (get-buy-now-cars.query.ts) | passenger cars only, Copart and Encar alternating, Copart first | Owner decision 14 |
| 13 | Auction rail: „Аукционни автомобили", its title and lead, 6 newest non-Buy-Now listings with a photo, „Виж всички аукционни автомобили" → `?channel=auction` (page.tsx:71-80, get-auction-cars.query.ts) | passenger cars only; „Вижте всички аукционни автомобили" | Owner decision 14; the button „Всички аукционни автомобили" (owner decision 28: the formal wording didn't fit one line on small phones) |
| 14 | Rails: autoplay every 2 s while on screen, pause on hover, an arrow click pauses it for 6 s, rewind at the ends, arrows „Назад" / „Напред" never disabled, photos wait for first paint (car-cards-carousel.tsx) | `hm-flow-cars`: the same; 5,3 / 4,3 / 3,15 / 2,2 / 1,15 cards visible by width; the car page's rail adds a pause button „Спрете превъртането" | Kept; the visible counts as drawn. Since the car page (18.11.2026) `CarRail` also has the pause button and holds autoplay while focus is inside (README, carousels; WCAG 2.2.2), on these rails too |
| 15 | Database empty or down: both rails show the `FALLBACK_*` cars of data/home.ts (get-*.query.ts) | `hm-home-states` | Kept verbatim |
| 16 | „Популярни марки" header with „Започни от марката, която търсиш" and its lead (popular-brands-section.tsx) | „Започнете от марката, която търсите" | Formal address |
| 17 | Brands grid: „Популярни марки", „Виж всички →" → `/vsichki-avtomobili`; 18 logo tiles, grey until hover, each to its make hub or, missing from the database, the catalog (brands-grid.tsx) | „Вижте всички" with an arrow icon; tiles with the logo on a plate in full colour; 3 per row on a phone | Formal address; colour logos (decision 8) |
| 18 | Final CTA: „Кажи ни какъв автомобил търсиш, а ние ще изградим правилния път до него", the lead, „Запитване" opens the inquiry (final-cta-section.tsx) | a dark panel: „Кажете ни … търсите …", primary „Запитване" | Formal address; panel as drawn (direction B: no gradients) |
| 19 | Sections fade and slide in over 0,8 s as they scroll in, under reduced motion too (`Reveal`, globals.css) | not drawn | Kept, at 300 ms, and still under reduced motion (README, motion) |
| 20 | The page is a static shell: both rails are cached for hours and prerendered | — | Kept |

Nothing on this page writes data. The inquiry it opens is the inquiry modal's own check.
