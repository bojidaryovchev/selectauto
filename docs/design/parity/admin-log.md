# Journal · `/admin/dnevnik` (`app/admin/dnevnik/page.tsx`, `lib/audit-details.ts`)

- Boards (admin canvas): `ad-log` (d, t, p), `ad-log-states` (flow), `ad-log-kinds`, `ad-log-kinds2` (flows). The
  design run's notes: `D:/design/selectauto/notes/ad.md` (rows 84–87, sections 2–4).
- Code on main, read in full: `app/admin/dnevnik/page.tsx`, `lib/audit-details.ts`,
  `queries/admin/list-audit-events.query.ts`, `constants/audit.ts`.
- Checked before building: 18.11.2026 · Walked after building: 18.11.2026 on the local build, signed in as a real
  admin (the page only reads). Walked: the page at 1440, 820 and 390 on the 1300 live events (the table at 1440,
  cards below; no sideways scroll); the chips; „Намерени: 1300"; amounts („2448,00", „10 079,00"), dates („17.11.2026
  г.") and a rate („0,89") in the details; the records in orange where they link, a mobile.bg advert in a new tab with
  its icon, the others in plain text; the „Получател" filter (6); an unknown filter („Няма записи." with its icon);
  page 2. The formatting checked on made-up events as well: „11 330,00", „1910,00", „50,00", „25.10.2026 г.", „0,9259",
  „— → 0,6345", „Валута на приспаднатия депозит", and a value it can't read printed as stored.

## What the code does today

| # | What the code does today (file:line) | On the board | Outcome |
|---|---|---|---|
| 1 | Admins only; tab title „Дневник"; „Дневник" and its paragraph (page.tsx:10, 28, 46-49) | `ad-ph` | — |
| 2 | „Всички" and a chip per record type that has rows, as links keeping the filter in the address (page.tsx:51-69; list-audit-events.query.ts:69-78) | the kit's chips | — |
| 3 | „Намерени: N" (page.tsx:71-73) | `ad-count` | — |
| 4 | „Няма записи." (page.tsx:75-76) | `ad-empty` with a clock icon | — |
| 5 | Each event, newest first: the action in bold, „26.10.2026 г., 13:42", the record („Договор #74") linked while it exists (the contract, the deposits, the recipients, the users, the hidden listings, the numbering's register; a mobile.bg advert's car page in a new tab; 40 px to tap), the actor's e-mail or „—", the details as label/value lines; cards below a 56rem list, a table above (Дата, Обект, Действие, Потребител, Детайли; capitals through CSS) (page.tsx:78-165; lib/audit-details.ts:180-213) | `ad-lg` cards and `ad-tbl`, the record in orange when linked, an external-link icon for mobile.bg, `ad-kv`; the cards below a 1200 px window | As drawn, in sentence case; the switch stays on the list's own width (56rem), as the lead inboxes do |
| 6 | The details: statuses, stages, markets, kinds and roles in Bulgarian; an edit lists only what changed („before → after"); ids and hashes left out; amounts, dates and rates as stored („11330.00", „50", „2026-10-25", „0.9259"); the key „depositDeductionCurrency" printed raw (lib/audit-details.ts:27-178) | „11 330,00", „1910,00", „50,00", „25.10.2026 г.", „0,9259"; „Валута на приспаднатия депозит" | Decision 3 (notes ad §4): amounts with two decimals in bg-BG, dates as „25.10.2026 г.", rates up to six decimals, both sides of an edit; owner decision 12 for the label |
| 7 | The pager, 100 a page (page.tsx:124; constants/audit.ts:55) | `ad-pager` | — |
| 8 | Light cards | the night ground | The kit's |
