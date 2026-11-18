# Import hubs · `/vnos-na-koli-ot-korea`, `/vnos-na-koli-ot-sasht`, `/vnos-na-koli-ot-kanada`

- Boards: `im-hub-kr`, `im-hub-us`, `im-hub-ca` (d, t, p), `im-hub-states` (fixed), `im-hub-flow` (phone flow). The
  design run's notes: `D:/design/selectauto/notes/im.md` §1–§4.
- Code on main, read in full: `app/vnos-na-koli-ot-korea/page.tsx`, `app/vnos-na-koli-ot-sasht/page.tsx`,
  `app/vnos-na-koli-ot-kanada/page.tsx`, `components/hubs/hub-testimonials.tsx`, `lib/google-reviews.ts`, and what they
  render: the estimator (see [kalkulator.md](kalkulator.md)), `getCarsPage` and the car card
  ([car-card.md](car-card.md)).
- Checked before building: 18.11.2026 · Walked after building: 18.11.2026, at 1440, 820 and 390. The estimators open
  on their market: Korea 26 515 $, Canada 26 126 $, the USA asking for the auction's location. Six cards per rail; the
  arrows disabled at each end; the FAQ's count equal to its JSON-LD (9, 8, 8), the first answer open; „Направете
  запитване" in the closing band opens the inquiry modal. On a phone the bar stays hidden while the hero's actions are
  on screen at load, shows over the articles and the rail, hides over the calculator and the closing band, and its
  calculator button lands the section under the top bar. The loading state was seen with JavaScript off; the empty
  rail and the reviews, which today's data can't show, with their markup injected. No request other than GET left
  the browser.

Line numbers are Korea's page unless a row names another; the three pages share one structure.

## What the code does today

| # | What the code does today (file:line) | On the board | Outcome |
|---|---|---|---|
| 1 | Metadata: titles „Внос на коли от Корея — Encar, газ/LPI, изгодни цени \| SelectAuto" and the like; descriptions „Внос на автомобили от Корея с SelectAuto — …" (page.tsx:40-50; САЩ :32-42; Канада :33-43); canonical; share card | head only | Fixed: „със SelectAuto" (REDESIGN.md, bugs: copy). The rest as written |
| 2 | JSON-LD: BreadcrumbList Начало → Внос на коли от …, FAQPage (the visible FAQ), Service (page.tsx:139-157) | — | Kept |
| 3 | A visible breadcrumb Начало / Внос на коли от … (page.tsx:161-167) | the kit's „Пътечка" | As drawn: the same trail, with the accessible name „Пътечка" |
| 4 | H1 „Внос на коли от Корея" (capitals through CSS) and two paragraphs (page.tsx:169-183) | the hero, the market's flag before the title | Sentence case (decision 10); the flag is decorative. The paragraphs as written |
| 5 | „Защо коли от …": four cards, an H2 and four H3s (page.tsx:186-196) | the reasons panel beside the hero (under it below 1024 px), an icon for each | As drawn; the text as written |
| 6 | — | the hero's actions „Направете запитване" (the inquiry modal) and „Калкулатор за внос" (a jump to the calculator) | New places for two existing actions (design-run notes §2, „Hub hero"). Nothing moves away from where it was |
| 7 | Korea: „Митото от Корея: 0% или 10%?" with three paragraphs (page.tsx:199-220); Канада: „„0% мито по CETA“ — митът за Канада" (kanada:186-201) | article bands with an icon (a landmark; scales) | As drawn; the text as written |
| 8 | Calculator: H2 „Колко струва внос от …", the intro „Изчисли ориентировъчна разбивка… направи запитване." (Korea with „Ставките са проверени към 21.07.2026"), the estimator preset to the market (page.tsx:223-231; САЩ :223-230; Канада :175-182) | the same, the section the jumps land on (`#kolko-struva-kr`, `-us`, `-ca`) | Formal „Изчислете…", „направете запитване". The estimator is the one rebuilt with /kalkulator; phones keep its single form (REDESIGN.md, open point 14). The intros' claims stay as written (design-run „съмнителен текст" 1–3) |
| 9 | Korea: „Как проверяваме историята — Encar доклад", three paragraphs and the link „безплатната VIN проверка" → /proverka-vin (page.tsx:234-256) | an article band with an icon | As drawn |
| 10 | Korea: „Коли на газ (LPI) от Корея" and „Части и сервиз в България", two sections (page.tsx:259-289) | two cards side by side, each title an H2 with an icon | As drawn; one column below 1024 px |
| 11 | САЩ: „Видове title — какво всъщност купуваш", the intro „…какъв title купуваш…", four cards and the note with „безплатна VIN проверка" → /proverka-vin and „Carfax доклад" → /carfax (sasht:196-221) | four columns, the icons in state colours: clean green, salvage amber, rebuilt blue, flood red | Formal „купувате" twice; the colours as drawn (design-run question 10). The note and its links kept |
| 12 | „Процесът стъпка по стъпка": five numbered cards (page.tsx:292-304); Korea adds the note with „Процес" → /proces (:305-311) | five columns with outlined numbers; two columns on a tablet, a list on a phone | As drawn. It stays an ordered list, so the numbers are read once |
| 13 | „Срокове, транспорт и стъпките след пристигане": two cards, H3 each, with bold figures (page.tsx:315-343) | two cards with an icon each (a clock; a file with a tick) | As drawn; the text as written. Korea's sea-route wording waits for REDESIGN.md point 6 |
| 14 | „Актуални коли от …": up to six active listings of the market (`getCarsPage({ market }, null)`, the first six) in a grid of 1–3 columns, and „Виж всички →" → /vsichki-avtomobili?market=… (page.tsx:346-359, 444-468) | a row of cards that scrolls and snaps (4 columns on a desktop, 5 and 6 on wide screens, 3, 2, 1,16 on a phone), „Вижте всички" with an arrow icon, and the arrows „Назад" and „Напред" | As drawn (design-run question 6): the same six cards, the kit car card with all its fields. An arrow moves one card and is disabled at its end; phones swipe. It never moves by itself, as today's grid didn't, so it needs no pause button. Formal „Вижте всички" |
| 15 | While the listings load: three grey boxes (page.tsx:471-479) | `im-hub-states`, `im-hub-flow` frame 3: four card skeletons, both arrows disabled | As drawn |
| 16 | No listings: „В момента няма активни обяви за коли от Корея. Заяви персонална селекция и ще намерим подходящ автомобил." (page.tsx:454-459) | `im-hub-states`, frame 4: a panel with a car icon, „Вижте всички" without arrows | Formal „Заявете персонална селекция" |
| 17 | „Какво казват клиентите": up to three Google reviews, the stars as „Оценка N от 5" with the ones above the rating dimmed, the text cut at five lines, the author, „Всички отзиви →" → /otzivi; nothing while there is no Places key or Google fails (hub-testimonials.tsx:14-46) | `im-hub-states`, frame 5: the kit review cards in three columns (one on a phone), „Всички отзиви" with an arrow icon | As drawn. The board's sample is 5 of 5, so it shows no dimmed star; the dimming stays, so a 4-star review still reads as 4. Hidden today: `GOOGLE_PLACES_ID` isn't set (REDESIGN.md point 2) |
| 18 | „Внос на коли от … до всяка точка на България", the cities paragraph (page.tsx:369-378) | an article band with a map pin | As drawn; the text as written |
| 19 | FAQ: every answer shown, an H3 and a paragraph each — Korea 9, САЩ 8, Канада 8 (page.tsx:381-391) | the kit accordion, the first answer open | As drawn (as on /kalkulator); every answer stays in the page, so the FAQPage JSON-LD still matches |
| 20 | „Сравни с другите пазари": three pill links, the other two hubs and „Калкулатор за внос" (page.tsx:394-419) | kit chips with the flags and a calculator icon | Formal „Сравнете…"; the links kept |
| 21 | CTA: „Искаш кола от Корея?", „Кажи ни марка, модел и бюджет — …", „Направи запитване" (capitals through CSS) → the inquiry modal (page.tsx:422-434) | a panel under the chips, the primary xl button | Formal „Искате…", „Кажете ни…", „Направете запитване" |
| 22 | — | on a phone, a bar with the calculator jump (named „Калкулатор за внос") and „Направете запитване" (`im-hub-flow` frame 1) | As drawn (design-run question 5), with the README's bar rules: it hides while the hero's actions, the calculator or the closing CTA is on screen, so a view never shows two of the same primary button; it follows the tabs and lifts back-to-top and the notifications. The page keeps its height free after the footer |
| 23 | A light page ground (`bg-[#fafafa]`) | the night ground | The shell's (decision 4) |

**18.11.2026.** Korea's shipping time reads „5–7 седмици" by sea and „8–10 седмици" to Bulgaria, in the body and the
FAQ; the Cape of Good Hope is gone (point 6, decision 34: most Asia–Europe lines are back on Suez). The US and Canada
pages were already right.
