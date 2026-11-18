# Import calculator · `/kalkulator`, the estimator, its e-mail form and the car page's dialog

- Boards: `im-calc` (d, t, p), `im-calc-kr`, `im-calc-us`, `im-calc-ca`, `im-calc-states`, `im-calc-offer` (fixed);
  `im-calc-flow`, `im-calc-flow2` (phone flows); `im-dialog`, `im-dialog-states` (fixed), `im-dialog-flow` (phone flow).
  The design run's notes: `D:/design/selectauto/notes/im.md` §1–§4.
- Code on main, read in full: `app/kalkulator/page.tsx`, `components/calculator/{cost-estimator,cost-estimator-from-url,
  calculator-offer-form,calculator-dialog,car-import-calculator}.tsx`, `data/import-rates.ts`, `lib/us-transport.ts`
  (the lookups), `schemas/calculator-offer.schema.ts`, `app/api/calculator-offer/route.ts`,
  `mutations/calculator-offers/create-calculator-offer.mutation.ts` (its messages).
- Checked before building: 18.11.2026 · Walked after building: 18.11.2026, at 1440, 820 and 390, and the dialog on the
  car page (IAAI 154485275, Encar 56270563). The figures equal the boards' with the default settings: Korea 26 515 $
  (24 400 $ with the declaration), USA via SAN DIEGO (CA) 92154 26 232 $, Canada British Columbia 27 605 $. The e-mail
  form was checked against mocked replies (validation, a server message, success, no connection); nothing was sent.

## What the code does today

| # | What the code does today (file:line) | On the board | Outcome |
|---|---|---|---|
| 1 | Metadata: „Калкулатор за внос на автомобил — колко струва \| SelectAuto"; description „Изчисли ориентировъчната цена…"; canonical; share card (page.tsx:12-23) | head only | Decision 1: „Изчислете…" |
| 2 | JSON-LD: FAQPage (the visible FAQ), BreadcrumbList Начало → Калкулатор за внос, WebApplication (page.tsx:70-99) | — | Kept |
| 3 | No visible breadcrumb | „Пътечка": Начало / Калкулатор за внос | As drawn (design-run question 7): the trail the page's JSON-LD already gives, now visible |
| 4 | H1 „Калкулатор за внос на автомобил" (capitals through CSS) and the lead „…по зададени от Вас стойности…" | a hero band | Sentence case (decision 10); „Вас" as written (decision 21) |
| 5 | The estimator seeded from `?market=&price=` (CostEstimatorFromUrl), the default one as its Suspense fallback | `im-calc-states` „Отворен от връзка" | Kept |
| 6 | Market: three buttons; price: a number field that can be cleared while typing (snaps back on blur); vehicle type, auction and Canada's province: dropdowns; US location: a searchable dropdown with „Зареждане на локации…", „Грешка при зареждане", „Избери локация", „Търсене на локация…", „Няма намерена локация" and the terminal note (cost-estimator.tsx:321-444) | segmented controls with flags; kit fields with their unit; the kit combobox with a map pin | As drawn (design-run question 3: the same choices, another control); formal „Изберете локация"; the spinner arrows are hidden, the arrow keys still step |
| 7 | Origin declaration (Korea) and technotest check boxes; customs base 1–100 % with its hint; the note „…по курс 1 € ≈ 1.08 $…" | kit check rows; „1,08 $" | Decision 11: the decimal comma. The check rows show the keyboard focus |
| 8 | The settings from `/api/calc-config` over the defaults; the US tariff table fetched only when the US market is first chosen; a car's yard preselected, never an invented one | — | Kept |
| 9 | The breakdown: payments with fees quoted in € shown in €, the rest in $, muted rows; „Общо (ориентир)" (capitals through CSS); „Ориентировъчен срок за доставка: …"; the disclaimer with „НЕ"; states: tariffs loading, tariffs error, choose a location, no transport price | `im-calc*`, `im-calc-states` | Sentence case for the total's label; „НЕ" as written (decision 11); the loading state with a spinner and placeholder lines, as drawn |
| 10 | The labels „…документи (2.5%)" and the like (import-rates.ts:266-339), which the offer e-mail repeats | „(2,5%)", on the e-mail boards too | Decision 11: the decimal comma, in the breakdown and the e-mail (`bgDecimal`). Offers saved before keep their labels (the admin shows them as saved) |
| 11 | E-mail form: „Получи разбивката на имейл" opens it; title „Получи тази разбивка на имейл"; fields by placeholder „Име", „Телефон (08…)", „Имейл"; zod messages under the fields; „Изпрати ми разбивката" / „Изпращане…"; the consent line; success „Готово! Изпратихме…"; server and network messages in one box (calculator-offer-form.tsx) | `im-calc-offer`: labels above the fields (the same words), errors with an icon, messages in an alert with the first sentence bold | Formal address („Изпратете ми разбивката"), and the button „Разбивката на имейл" (owner decision 28); the title „Получете тази разбивка на имейл"; every message word for word. POST `/api/calculator-offer` (BotID, a record, two e-mails) unchanged, and never sent in tests |
| 12 | „От какво се състои крайната цена": 8 cards (page.tsx:123-166) | cards with an icon each, 4 columns | As drawn; the text as written (the leva amounts are design-run „съмнителен текст" 6) |
| 13 | FAQ: 6 questions, every answer shown (page.tsx:168-179) | the kit accordion, the first answer open | As drawn (the design run's call); the answers stay in the page, so the FAQPage JSON-LD still matches. The Cape wording in the last answer waits for point 6 |
| 14 | „Полезни страници": 5 links (page.tsx:183-203) | chips with flags and icons | As drawn |
| 15 | CTA „Искаш точна оферта?", „Кажи ни…", „Направи запитване" (capitals through CSS) → the inquiry modal (page.tsx:206-218) | a panel beside the links, the primary button | Formal address |
| 16 | Phone: the same single form | a six-step guided sequence with a running total (`im-calc-flow`, `-flow2`) | Not built: it changes how the calculator works on a phone and no decision covers it (design-run question 4). Phones keep the single form in the kit look; REDESIGN.md, open points |
| 17 | Car page dialog: portalled, a press outside or Esc closes it, body scroll locked, focus to the close button; „Калкулатор за внос", the car and „ · Лот № …" or „Ориентировъчна оценка на разходите до България."; close „Затвори"; full screen on a phone (calculator-dialog.tsx) | `im-dialog*`: the kit dialog; on a phone a footer with the running total or the prompt | Formal „Затворете"; the phone footer as drawn (design-run question 12). Focus goes back to „Калкулирайте вноса до България" on close |
