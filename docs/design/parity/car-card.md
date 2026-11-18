# Car card · `auction-card.tsx` (catalog, home rails, hubs, related cars, favourites)

- Boards: `kit-cards` (board, every kind of card), `ct-status` (statuses), the cards inside `ct-*`, `hm-*`, `ac-fav*`;
  the removal dialog in `ac-fav-flow`; the admin dialogs in `ab-dialogs`.
- Code on main, read in full: `components/cars/all-cars/{auction-card,auction-countdown,car-card-image,card-glass,car-grid-skeleton}.tsx`,
  `components/cars/favorite-button.tsx`, `components/common/confirm-dialog.tsx`, `lib/car-mapper.ts` (`carListingToView`),
  `lib/car-labels.ts` (statuses), `types/car.type.ts`, `queries/cars/get-car-facets.query.ts` (`getCarBrands`).
- Checked before building: 18.11.2026 · Walked after building: 18.11.2026, on the catalog (active and past), the home
  rails and /lyubimi at 1440 and 390, signed out and signed in.

| # | What the code does today | On the board | Outcome |
|---|---|---|---|
| 1 | Photo from the source CDN, eager for the first row, lazy otherwise, deferred in the carousels; a Copart `_ful` miss falls back to the stored image | photo, 3:2 · `kit-cards` | Kept; the frame becomes 3:2 (was 40:26) |
| 2 | No photo: „Снимка при поискване" (capitals through CSS) | a camera icon and „Снимка при поискване" · `kit-cards` „Без снимка" | — (no listing lacks a photo today, read-only check 18.11.2026, so it was checked in the code only) |
| 3 | The photo and the title link to `/avtomobil/<id>` | yes | — |
| 4 | Source badge (COPART, IAAI, ENCAR …) top left | yes | — |
| 5 | BUY NOW badge with a valid buy-now price; „ПРОДАДЕН" on past cards | gold BUY NOW mark and „ПРОДАДЕН" tag at the photo's bottom left | Moved as drawn |
| 6 | Favourite heart for every car with an id; signed out it sends to `/sign-in?redirectTo=…`; optimistic, rolled back on failure; on /lyubimi removal asks first | yes · `kit-cards`, `ac-fav-flow` | — |
| 7 | Heart labels „Запази в любими" / „Премахни от любими"; dialog „Премахване от любими", „Сигурни ли сте…", „Премахни", „Отказ" | „Запазете…", „Премахнете…", „Премахнете" | Formal address |
| 8 | A tap on the heart while the session still loads sends a signed-in user to sign-in (REDESIGN.md, bugs) | not drawn | Fixed: the tap waits for the session |
| 9 | Phone and Viber buttons on the photo, for active cars only; labels „Обади се", „Viber" | an action row under the price: „Подробности", phone („Обадете се"), Viber („Viber група") | Moved as drawn; formal address |
| 10 | Status bar: a live countdown „Време до търга" with days only when ≥ 1 day; otherwise „Статус" and the status; past cards „Статус" and the result | yes; digits in mono; orange under 24 h; a status dot coloured by meaning | Dots and the 24-hour colour from the README |
| 11 | Title, two lines, capitals through CSS | yes, as stored | Sentence case rule (decision 10) |
| 12 | 11 fields, „—" when missing, one line each, full value on hover; Пробег and Състояние in orange | the same 11, Двигател across both columns, no orange | Order and colour as drawn; every field kept |
| 13 | Price row always shown: „Продаден за" (past), „Buy Now", or „Цена"; „—" without a price | yes | — |
| 14 | „Подробности" (active) or „Виж активни обяви" → `/vsichki-avtomobili` (past) | „Подробности" primary; „Вижте активни обяви" secondary | Formal address |
| 15 | Uniform card height for the virtualized grid | yes | Kept: every row always renders |
| 16 | Dimmed glass over the card while a filter change loads | dimmed card · `kit-cards` „обновява се" | — |
| 17 | Skeleton card while loading | yes · `kit-cards` „Зарежда се" | — |
| 18 | No make shown | the make's logo on a light plate; two letters without a logo; no plate without a make | New (decision 8). Makes come from `manufacturers` (cached) |
| 19 | Confirm dialog (14 screens): icon, title, message, cancel focused, Esc and backdrop cancel, „Моля изчакайте..." while pending | yes, with ✕ to close · `ac-fav-flow`, `ab-dialogs` | ✕ added (README); default confirm „Потвърдете" |
| 20 | Signed in, every heart reads empty until the saved cars load; a tap then toggles on the server, so on a saved car it removes it, and on /lyubimi without the question (found 18.11.2026) | not drawn | Fixed: the tap waits for the saved cars, like row 8 |
| 21 | A save that never reaches the server (offline) throws inside the transition, and the error boundary replaces the whole page with „This page couldn't load" (found 18.11.2026) | not drawn | Fixed: rolled back like a refused save, the page stays |
| 22 | Signed in, a failed load of the saved cars (no connection, a server error) left every heart waiting for the rest of the visit, so with row 20 each tap did nothing (found 18.11.2026) | not drawn | Fixed: the load is tried again after 5, 10, 20 and 40 s, then every minute, and at once when the connection comes back; a tap meanwhile tries again and says „Възникна грешка. Опитайте отново." |
