# Users · `/admin/potrebiteli` (`components/admin/users`)

- Boards (admin canvas): `ad-users` (d, t, p), `ad-users-dialog` (fixed 1440), `ad-users-list` (flow, 4 frames),
  `ad-users-roles` (flow, 5 frames), `ad-errors`. The design run's notes: `D:/design/selectauto/notes/ad.md` (rows
  80–83, sections 2–4).
- Code on main, read in full: `app/admin/potrebiteli/page.tsx`, `components/admin/users/*`,
  `mutations/users/set-user-roles.mutation.ts`, `queries/users/list-users.query.ts`, `constants/admin.ts` (the roles).
- Checked before building: 18.11.2026 · Walked after building: 18.11.2026 on the local build, signed in as a real
  admin; every role change answered by a mock or cut off, so nothing written. Walked: the page at 1440, 1100, 820 and
  390 on the 50 live accounts (the table at 1440, cards below; no sideways scroll; no chip on two lines); one's own
  row locked with its hint; „непотвърден"; the legend open; „Само с роли" (10 of 50); a search with no match. A role
  tapped: the row locked while saving, then saved; „Това е последният администратор — …" and the lost connection
  under their own row, the previous message gone; „Да дам ли права на администратор?" with „Дайте права", and „Да
  отнема ли правата на администратор?" with „Отнемете правата" and its lost connection; the dialog waiting („Моля
  изчакайте...") while another row saves. On a temporary route, deleted before the commit: no accounts at all.

## What the code does today

| # | What the code does today (file:line) | On the board | Outcome |
|---|---|---|---|
| 1 | Admins only; tab title „Потребители"; „Потребители" and its paragraph (page.tsx:10, 19, 25-28) | `ad-ph` | — |
| 2 | „Какво може всяка роля" (folded): each role in bold with its description (page.tsx:30-42; constants/admin.ts:51-69) | `ad-det` with a chevron | — |
| 3 | The search („Търсене по име или имейл…", a hidden label of the same words) over names and e-mails, „Само с роли" (a pressed chip), „Показани: N от M" (announced politely) (users-manager.tsx:54-97) | `ad-utools` with a search icon, the kit's chip, `ad-count` | — |
| 4 | „Няма регистрирани потребители." / „Никой не отговаря на търсенето." (users-manager.tsx:99-102) | `ad-empty` with a users icon | — |
| 5 | Every account, oldest first: the name or „—", „(вие)" for oneself, the e-mail, „непотвърден" while it isn't confirmed, „Регистриран {дата}"; cards below a 56rem list, a table above (Потребител, Регистриран, Роли; capitals through CSS) (users-manager.tsx:104-191; list-users.query.ts) | `ad-uc` cards and `ad-tbl`; „непотвърден" as the kit's amber tag with its dot; the cards below a 1200 px window | As drawn, in sentence case; the switch stays on the list's own width (56rem, a 1220 px window with the sidebar), as the lead inboxes do |
| 6 | The roles as chips over real checkboxes, in a group „Роли на …": „Администратор", „Наблюдаващ", „Наблюдаващ – всички договори"; one's own locked, with „Собствените си права не можете да променяте."; a row being saved locked; its error under it („Връзката прекъсна — ролята не е сменена. Опитайте отново.", the server's refusals) (users-manager.tsx:34-47, 193-218) | the kit's chips with a tick when on, dimmed when locked; the kit's error under the row | As drawn |
| 7 | „Администратор" asks first: „Да дам ли права на администратор?" / „{име} ще има пълен достъп: всички договори, плащания, заявки, поща, тарифи и потребители.", „Дай права"; „Да отнема ли правата на администратор?" (danger) / „{име} губи пълния достъп до минута.", „Отнеми правата"; the dialog closes before the change, and waits („Моля изчакайте...") while another change is saving; the other roles switch at a tap (users-manager.tsx:49-52, 141-160) | `ad-users-dialog`, `ad-users-roles` | Formal „Дайте права", „Отнемете правата" (decision 1) |
| 8 | The server's messages: „Нямате достъп до тази операция.", „Невалиден потребител.", „Не можете да променяте собствените си права.", „Непозната роля: …", „Потребителят не е намерен.", „Това е последният администратор — ролята му не може да се отнеме.", „Възникна грешка при запазването. Моля опитайте отново." (set-user-roles.mutation.ts) | `ad-errors`, `ad-users-roles` | — |
| 9 | Light panels | the night ground | The kit's |
