# Leasing calculator · `/lizingov-kalkulator`

- Boards: `im-leasing` (d, t, p), `im-leasing-states` (fixed), `im-fin-flow` (phone flow, frames 1–3). The design run's
  notes: `D:/design/selectauto/notes/im.md`.
- Code on main, read in full: `app/lizingov-kalkulator/page.tsx`, `components/calculator/{leasing-calculator,calc-field,
  calc-slider,calc-term-select,calc-gauge,calc-result-row}.tsx`, `lib/finance.ts`, `app/globals.css` (`.calc-range`).
- Checked before building: 18.11.2026 · Walked after building: 18.11.2026, at 1440, 820 and 390: 35 000 € with 30 % →
  479 €; the 10 % preset → 3500 € and 616 €; the ГПР field „6,5" typed as „7,2" and stepped with ↑ to „7,3"; the phone
  bar shown over the inputs and hidden over the summary.

## What the code does today

| # | What the code does today (file:line) | On the board | Outcome |
|---|---|---|---|
| 1 | Metadata „Лизингов калкулатор — месечна вноска за автомобил \| SelectAuto"; descriptions „Изчисли месечната…" (page.tsx:10-21) | head only | Decision 1: „Изчислете…" |
| 2 | JSON-LD: FAQPage, BreadcrumbList Начало → Лизингов калкулатор, WebApplication | — | Kept |
| 3 | No visible breadcrumb; H1 „Лизингов калкулатор" (capitals through CSS); the lead | the hero with „Пътечка" | The trail its JSON-LD gives, now visible (design-run question 7); sentence case (decision 10) |
| 4 | Price 5000–150 000 €, field (clearable while typing) and slider; down payment field and slider („€0" / „Макс"), never above the price; presets 10/15/20/30 %, the matching one pressed; term 12–72 months; ГПР 1–30 % with „Лихвен процент" (leasing-calculator.tsx) | kit fields with „€" / „%", the kit slider, segmented presets, the month grid; „6,5" | As drawn; decision 11: the ГПР shows „6,5" and takes a comma or a dot; ↑ and ↓ still step as before. The sliders get the kit's orange fill (today's track has none) |
| 5 | Summary „Обобщение": the ring (fixed at 82 %) with „Месечно", the payment, „лизингова вноска"; the four rows; „Кандидатствай" (capitals through CSS) → the inquiry modal; the disclaimer | a white ring, rows, the primary xl button | Formal „Кандидатствайте"; the ring stays fixed, as today (design-run „съмнителен текст" 10). 35 000 €, 30 %, 60 months, 6,5 % → 479 € |
| 6 | — | on a phone, a bar with „Месечно", the payment and „Кандидатствайте" (`im-fin-flow`) | New on phones, as drawn: it hides while the summary is on screen (README, bars), follows the tabs and lifts back-to-top |
| 7 | „Как да разчетете резултата": 4 cards | cards with icons | As drawn |
| 8 | FAQ: 4 questions, all answers shown | the kit accordion, the first open | As drawn (the answers stay in the page for the FAQPage JSON-LD) |
| 9 | „Свързани инструменти": the budget and import calculators | link cards with an icon and an arrow | As drawn |
| 10 | CTA „Искаш точни условия за лизинг?", „Кажи ни…", „Направи запитване" (capitals through CSS) | a panel beside the links | Formal address |
| 11 | Sections fade in on scroll (`Reveal`) | — | Kept |
