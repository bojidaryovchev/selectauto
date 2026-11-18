# Reviews · `/otzivi`

- Boards: `in-otzivi` (d, t, p: today's state, no reviews), `in-otzivi-google` (fixed: the page with Google reviews),
  `in-otzivi-flow` (phone flow: loading, the profile link, reviews, reviews without an aggregate). The design run's
  notes: `D:/design/selectauto/notes/in.md` §1, §2, follow-up 1.
- Code on main, read in full: `app/otzivi/page.tsx`, `lib/google-reviews.ts`.
- Checked before building: 18.11.2026 · Walked after building: 18.11.2026, at 1440 and 390: today's state (no Place
  ID): the Google panel beside the CTA, no profile link. The reviews and the loading state can't be produced locally;
  their markup follows `in-otzivi-google` and `in-otzivi-flow`.

## What the code does today

| # | What the code does today (file:line) | On the board | Outcome |
|---|---|---|---|
| 1 | Metadata „Отзиви — какво казват клиентите \| SelectAuto", description, share card; BreadcrumbList JSON-LD only, no Review or AggregateRating schema (page.tsx:13-49, 140-151) | `info-meta` | Kept |
| 2 | A visible breadcrumb; H1 „Отзиви" (capitals through CSS); the intro (page.tsx:154-166) | the head band | Sentence case (decision 10); the text as written |
| 3 | The reviews stream in; meanwhile four grey blocks (page.tsx:128-136, 168-172) | `in-otzivi-flow` frame 1: four placeholder blocks named „Зареждане" | As drawn |
| 4 | No reviews (no key, no Place ID, or Google unavailable): „Вижте отзивите на нашите клиенти директно в Google — …" and, only with a Place ID, „Виж отзивите в Google" → the Google profile in a new tab (page.tsx:79-101) | `in-otzivi`: a panel with the Google mark beside the CTA; frame 2 with the link | Formal „Вижте отзивите в Google"; shown only with a Place ID, as today. Today's live state (REDESIGN.md point 2) |
| 5 | With reviews: the aggregate „4.8", stars and „{n} отзива в Google", only when Google returns both rating and count; review cards with author, stars (when rated) and text, and the relative time when there is one; „Отзивите се зареждат от Google профила на SelectAuto." (page.tsx:103-125, 53-77) | `in-otzivi-google`; frame 4 without the aggregate | As drawn. Decision 11: the rating with a decimal comma („4,8", also in the stars' name „4,8 от 5"). Filled stars white, the rest dim |
| 6 | CTA „Готов ли си за своя автомобил?", „Присъедини се … Кажи ни…", „Направи запитване" (capitals through CSS) → the inquiry modal (page.tsx:175-187) | beside the Google panel without reviews; a row under them with reviews | Formal „Готови ли сте за своя автомобил?", „Присъединете се … Кажете ни…", „Направете запитване" |
| 7 | A light page ground | the night ground | The shell's (decision 4) |
