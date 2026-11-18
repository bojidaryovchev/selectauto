# Favourites · `/lyubimi`, and the heart's failed save

- Boards: `ac-fav` (d, t, p: signed in), `ac-fav-out` (d, t, p: signed out), `ac-fav-st` (switch states, loading,
  empty list, the dialog waiting, a failed removal and its toast), `ac-fav-flow` (phone flow), `ac-fav-guest` (phone
  flow, signed out and the heart elsewhere). The design run's notes: `D:/design/selectauto/notes/ac.md` §1–2 and the
  follow-up of 26.10.2026 („A failed favourite toggle").
- Code on main, read in full: `app/lyubimi/page.tsx`, `components/cars/favorites-grid.tsx`,
  `components/cars/auction-alert-toggle.tsx`, `components/cars/favorite-button.tsx`, `contexts/favorites-context.tsx`,
  `mutations/favorites/*`, `queries/favorites/*` (but the cron's due-alerts query), `components/layout/site-toaster.tsx`.
- Checked before building: 18.11.2026 · Walked after building: 18.11.2026 at 1440, 820, 390 and 320, signed out and
  signed in (a session minted locally for a real account with 14 saved cars). Every Server Action mocked by its
  arguments in the real response envelope; nothing written. Walked: the sign-in panel and its link; the header with
  the switch and the intro, the 14 cards; the switch flipping at once, waiting, and a refusal rolling it back with
  its message; a removal asked, the card gone at once, a refusal bringing it back with the toast, a removal that went
  through; the empty list with „Разгледайте автомобили"; the loading state (the title and 8 skeleton cards). No
  sideways scroll.

## What the code does today

| # | What the code does today (file:line) | On the board | Outcome |
|---|---|---|---|
| 1 | `<title>` „Любими автомобили \| SelectAuto", `noindex, nofollow` (page.tsx:10-14) | — | — |
| 2 | H1 „Любими автомобили" in capitals through CSS, in the static shell (page.tsx:32-34) | `ac-fav`: the H1 in a header with the alert switch beside it | Sentence case (decision 10); the H1 also stands in the loading state |
| 3 | While the session and list load: the catalog's card skeletons (page.tsx:36) | `ac-fav-st` 6: the H1 and the skeleton grid | As drawn |
| 4 | Signed out: „Влезте в профила си, за да виждате и управлявате запазените автомобили." and „Вход / Регистрация" → /sign-in?redirectTo=/lyubimi (page.tsx:52-68) | `ac-fav-out`: a panel with a sign-in icon | As drawn |
| 5 | Signed in: the alert switch, then the saved cars, active first then sold, newest saved first (page.tsx:70-80; get-favorite-cars.query.ts) | the switch in the header, the cards in the kit's grid | As drawn; the query unchanged |
| 6 | The switch row: a bell, „Известия за търгове днес", „Получавайте имейл с любимите си автомобили, чийто търг е днес.", a `role="switch"` named „Известия за търгове днес по имейл"; it flips at once, is disabled while saving, rolls back on failure with „Възникна грешка. Моля опитайте отново." (auction-alert-toggle.tsx:23-75) | `ac-fav-st` 2–5: the kit's switch, the bell orange when on, dimmed while saving, the message under the description | As drawn; the action unchanged |
| 7 | „Автомобилите, които сте запазили. Активните можете да внесете — продадените са за справка." above the grid, only while cards show (favorites-grid.tsx:47-49) | under the H1, beside the switch | As drawn; still only with cards |
| 8 | A card drops out as soon as its heart is turned off; until the list has loaded the server's list shows as is (favorites-grid.tsx:22-27) | `ac-fav-flow` | Kept |
| 9 | Removing asks first: „Премахване от любими", „Сигурни ли сте…", „Премахни" / „Отказ" (favorite-button.tsx, the car card step) | the confirm dialog, its waiting state (`ac-fav-st` 1, 8) | Done with the car card („Премахнете") |
| 10 | No cards: „Все още нямате запазени автомобили." and „Разгледай автомобили" → /vsichki-avtomobili (favorites-grid.tsx:29-43) | `ac-fav-st` 7: a panel with a heart; the switch stays | Formal „Разгледайте автомобили" (decision 1) |
| 11 | A save or removal the server refuses, or that never arrives: the heart rolls back silently (favorite-button.tsx:68-73) | `ac-fav-st` 9–10, `ac-fav-flow` 5, `ac-fav-guest` 6: the heart back, and the toast „Възникна грешка. Опитайте отново." | New, as drawn (notes ac, follow-up; the lead's decision): the product's own words, as the VIN check shows them |
| 12 | A light page ground | the night ground | The shell's |
