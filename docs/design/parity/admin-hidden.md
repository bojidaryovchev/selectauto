# Hidden listings · `/admin/skriti-obyavi` (`components/admin/deindex`)

- Boards (admin canvas): `ab-hidden` (d, t, p), `ab-hidden-done` (d, t, p), `ab-hidden-states` and `-states2`
  (sheets), `ab-hidden-flow` (flow), `ab-dialogs`, `ab-messages`. The design run's notes:
  `D:/design/selectauto/notes/ab.md` (rows 90–93, sections 2 and 4).
- Code on main, read in full: `app/admin/skriti-obyavi/page.tsx`, `components/admin/deindex/*`,
  `queries/deindex/lookup-cars.query.ts` (types, the candidates), the fee check of
  `mutations/deindex/apply-deindex.mutation.ts`.
- Checked before building: 18.11.2026 · Walked after building: 18.11.2026 on the local build, signed in as a real
  admin; every lookup and action answered by a mock or cut off, so nothing written. Walked: the page at 1440, 1100,
  820 and 390 (the live register is empty: „Няма заявки за скриване." with an icon); a search („Търсете…" while it
  runs), two listings with their plates in the table, the request fields, „Скрийте от сайта и търсачките" and its
  dialog, the result („Скрити 2 обяви … mobile.bg: изтеглени 1 обява. …"), the listings „скрита" and „в каталога:
  не", „Възстановете" and its result; every search outcome (nothing found, refused, no connection, several cars, a
  car without a VIN). On a temporary route rendering the register with made-up requests, deleted before the commit:
  the table at 1440 and one column of cards at 820 and 390, „50,00 EUR" and „1250,50 EUR", the amber „1/2 не всички
  са скрити", a revoked request with its date.

## What the code does today

| # | What the code does today (file:line) | On the board | Outcome |
|---|---|---|---|
| 1 | Admins only; tab title „Скрити обяви"; „Скрити обяви" and its paragraph (page.tsx) | `ad-ph` | — |
| 2 | Search: „VIN, номер на лот или линк към обявата", the placeholder, „Търси" (primary) / „Търси…"; nothing usable: „Няма намерен автомобил по този VIN / номер на лот / линк.", the server's message, or „Връзката прекъсна — търсенето не завърши. Опитайте отново."; a car without a VIN: „… (обява №…) няма VIN. Скриването е по VIN, …" (deindex-manager.tsx:166-205) | `ab-srch` on a panel, a search icon, „Търсете" / „Търсете…" | Formal „Търсете" (decision 1); as drawn |
| 3 | Several cars for a number: „Номерът съвпада с няколко автомобила — изберете кой", a button per car (the title, „VIN … · обява №…" or „номер на лот") (deindex-manager.tsx:207-231) | `ab-choice` | — |
| 4 | „VIN … — N обява/обяви" and its paragraph; each listing: the URL (new tab), the car, „Лот …", the auction, „в каталога: активна / приключила / не", „скрита" / „видима"; cards below 48rem, a table above (deindex-manager.tsx:233-246, 328-422) | `ab-cand`: the VIN in mono, links with an external-link icon, the make's plate beside the car, the kit's tags (скрита red), cards below 768 px | As drawn; the plates per decision 8 (the lookup now returns each car's make) |
| 5 | The request: „Заявител", „Контакт", „Доказателство за собственост" („напр. талон №… / договор"), „Такса (EUR)" („напр. 50"); cleared on every search (deindex-manager.tsx:248-266) | `ab-reqf`, two columns from 512 px | — |
| 6 | „Скрий от сайта и търсачките" (danger) unless all are hidden; „Възстанови" when any is; the result next to them (IndexNow, mobile.bg withdrawals, the Google note; the lost-connection texts) (deindex-manager.tsx:94-159, 268-280) | a negative button with an eye-off icon, a secondary one with a rotate icon; the kit's alerts | Formal „Скрийте от сайта и търсачките", „Възстановете" (decision 1); as drawn |
| 7 | The dialogs „Скриване на обявите" („Скрий") and „Възстановяване на обявите" („Възстанови") with their texts (deindex-manager.tsx:284-323) | `ab-dialogs` | Formal „Скрийте", „Възстановете" |
| 8 | The fee: digits with a dot only, else „Невалидна сума." (apply-deindex.mutation.ts:76-79) | „50,5" accepted; „-5" → „Невалидна сума." | Changed: the money parser the contracts use (comma or dot, spaces), notes ab §4 decision 5 |
| 9 | „Заявки (N)"; each request: VIN, „Заявител" (+ contact), „Доказателство", „Такса" („50.00 EUR"), „Обяви" hidden/all (amber with „не всички са скрити" when an active request misses some), „Създадена" (+ e-mail), „Активна" / „Отменена" (+ date · e-mail); „Няма заявки за скриване."; cards below 56rem, a table above (capitals through CSS); the pager (page.tsx; deindex-request-list.tsx) | `ab-reg` cards and the kit's table; the VIN in mono; „50,00 EUR"; „Активна" red, „Отменена" neutral | As drawn: the fee in the bg-BG format (decision 11), sentence case |
| 10 | Light panels | the night ground | The kit's |

**18.11.2026.** „Скрита 1 обява" and „Възстановена 1 обява. Търсачките ще я обходят…" for one car (they read
„Скрити 1 обяви", „Възстановени 1 обяви").
