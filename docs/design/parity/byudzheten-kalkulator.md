# Budget calculator · `/byudzheten-kalkulator`

- Boards: `im-budget` (d, t, p), `im-budget-states` (fixed), `im-fin-flow` (phone flow, frames 4–5). The design run's
  notes: `D:/design/selectauto/notes/im.md`.
- Code on main, read in full: `app/byudzheten-kalkulator/page.tsx`, `components/calculator/{budget-calculator,calc-field,
  calc-slider,calc-term-select,calc-gauge,calc-result-row}.tsx`, `lib/finance.ts`.
- Checked before building: 18.11.2026 · Walked after building: 18.11.2026, at 1440, 820 and 390: 4500 / 2100 / 1000 € /
  60 months → 22 %, 66 492 € – 73 491 €, the catalog link with `price_max=73491`; expenses above income → „—"; the
  phone bar shown over the inputs and hidden over the result.

## What the code does today

| # | What the code does today (file:line) | On the board | Outcome |
|---|---|---|---|
| 1 | Metadata „Бюджетен калкулатор — каква кола мога да си позволя \| SelectAuto" and its descriptions (already formal) | head only | — |
| 2 | JSON-LD: FAQPage, BreadcrumbList Начало → Бюджетен калкулатор, WebApplication | — | Kept |
| 3 | No visible breadcrumb; H1 „Бюджетен калкулатор" (capitals through CSS); the lead | the hero with „Пътечка" | As on the leasing page (design-run question 7; decision 10) |
| 4 | „Нека пресметнем."; income and expenses fields; „Желана месечна вноска" with its value and a slider 100–5000 („€100" / „€5000+"); term 12–72 months (budget-calculator.tsx) | kit fields, the payment block, the month grid | As drawn |
| 5 | Result: the ring filled to payment ÷ income with „Влияние върху бюджета", the %, „от месечния доход"; „Можете да си позволите кола до" (capitals through CSS) and the range; rows „Прогнозен ГПР 5.5%" and four more; „Виж автомобили в този бюджет" → the catalog with `price_max`; the disclaimer | the white ring, the range, inset rows, the primary xl button | Sentence case; decision 11 „5,5%"; „Автомобили в този бюджет" (owner decision 28: the formal wording didn't fit one line on phones). 4500 / 2100 / 1000 € / 60 months → 22 %, 66 492 € – 73 491 €. Free income below zero reads „—", as today |
| 6 | — | on a phone, a bar with „Можете да си позволите кола до" and the range | New on phones, as drawn, with the leasing bar's rules |
| 7 | „Как да разчетете резултата": 4 cards | cards with icons | As drawn |
| 8 | FAQ: 4 questions, all answers shown | the kit accordion, the first open | As drawn |
| 9 | „Свързани инструменти": the leasing and import calculators | link cards | As drawn |
| 10 | CTA „Готов да намериш своя автомобил?", „Кажи ни бюджета…", „Направи запитване" | a panel beside the links | Formal: „Готови ли сте да намерите своя автомобил?", „Кажете ни…", „Направете запитване" |
| 11 | Sections fade in on scroll (`Reveal`) | — | Kept |
