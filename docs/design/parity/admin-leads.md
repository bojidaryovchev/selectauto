# Lead inboxes · `/admin/carfax`, `/admin/zapitvaniya`, `/admin/oferti` (`components/admin/lead-inbox`)

- Boards (admin canvas): `ad-carfax` (d, t, p), `ad-carfax-drawer` (fixed), `ad-carfax-phone` (flow), `ad-inquiries`
  (d, t, p), `ad-inquiries-list` (flow: filter and search, archive, nothing found, end of page),
  `ad-inquiries-drawer` (fixed), `ad-inquiries-status` (flow), `ad-inquiries-notes` (flow), `ad-inquiries-kept`
  (fixed), `ad-offers` (d, t, p), `ad-offers-drawer` (fixed), `ad-offers-markets` (flow), `ad-errors` (fixed). The
  design run's notes: `D:/design/selectauto/notes/ad.md` (rows 18–22, sections 2 and 5).
- Code on main, read in full: `app/admin/{carfax,zapitvaniya,oferti}/page.tsx`, `components/admin/lead-inbox/*`,
  `components/admin/lead-filters.tsx`, `components/admin/lead-status-badge.tsx`, `lib/admin-lead-view.ts`,
  `lib/admin-lead-filters.ts`, `types/admin.type.ts`, `queries/admin/list-{carfax-requests,inquiries,calculator-offers}.query.ts`,
  `mutations/admin/update-lead.mutation.ts`, `constants/admin.ts`, and `components/common/combobox.tsx`.
- Checked before building: 18.11.2026 · Walked after building: 18.11.2026 on the local build, signed in as a real
  admin; every `updateLead` call answered by a mock or cut off, so nothing written. Walked: the three inboxes at 1440,
  1280, 1150, 1104, 820, 390 and 320 (cards up to a 767 px list, the table from there with no sideways scroll, the VIN
  on one line, the plates' logos loaded, the flags, „Оферта" right-aligned, no label on two lines); a chip and search
  going back to page 1 („Архив" 5, „BMW" in the archive 2); nothing found with its icon; „Напред" to page 2 (36 rows);
  the drawer of each type (named by the person, focus inside, the eyebrow, the three lists, the links, Escape); the
  status saving (locked, the new value shown), saved (the drawer stays, the tag follows), refused and with no
  connection (back to the old value, the message under it); the notes saving („Запазване…" with a spinner), saved
  („Запазено"), refused and with no connection; closing with an unsaved note (the dialog over a dimmed drawer, „Върнете
  се" keeps the text, „Затворете без запазване" closes); the phone drawer at 390 and 320, full width.

## What the code does today

| # | What the code does today (file:line) | On the board | Outcome |
|---|---|---|---|
| 1 | Admins only (`requireAdminPage`: an observer goes to /); the tab title is the type's label („Carfax запитвания", „Консултации", „Оферти от калкулатора") (the three page.tsx) | `ad-shell-roles` redirects table | Kept |
| 2 | The header: the type's label as the title, nothing else (page.tsx) | `ad-ph` | — |
| 3 | Search: a search form, „Търсене" for screen readers, `type=search`, no autocapitalise or autocorrect, „Търси по име, телефон, VIN…", a primary „Търси"; it writes `q` to the address and goes back to page 1. Carfax matches name, phone, VIN, e-mail, make and model; consultations name, phone, make, model and the model answer; offers name, phone and e-mail (lead-filters.tsx:43-68; the list queries) | the kit's field with a search icon, a secondary „Търсете" | Formal „Търсете по име, телефон, VIN…" and „Търсете" (decision 1); as drawn; the queries unchanged |
| 4 | Status chips „Всички", Ново, В процес, Спечелено, Загубено, Архив in a group „Филтър по статус", pressed state; a chip writes `status` and goes back to page 1; „Всички" leaves the archive out, „Архив" shows only it (lead-filters.tsx:71-86; the queries) | `sa-chips` (`ad-inquiries-list` 1–2) | — |
| 5 | „Намерени: N" (lead-inbox.tsx:61-63) | `ad-count` | — |
| 6 | „Няма заявки за този филтър." when nothing matches (lead-inbox.tsx:66) | `ad-empty` with an inbox icon (`ad-inquiries-list` 3) | As drawn |
| 7 | Cards while the list itself is narrower than 48rem (two columns from 36rem), a table above: a container query on the list, so the sidebar's room counts (lead-inbox.tsx:17-19, 67-95) | cards below a 1100 px window, the table above; cards in columns of at least 340 px | The switch stays on the list's own width, 48rem: with the sidebar that is a 1086 px window, the board's 1100, and a landscape tablet keeps its table. The card grid as drawn |
| 8 | A card: the name and the status, then the other columns as label and value, then „Получено"; the whole card is a button that opens the lead (lead-inbox.tsx:69-92) | `ad-lc`; the status as the kit's tag with a dot; the VIN in mono; the make's plate beside the car; the market's flag | As drawn; the plates per decision 8 |
| 9 | The table: the columns, „Получено", „Статус" as headers (capitals through CSS); a click on the row opens the lead and the first cell is a button for the keyboard; other cells muted and broken anywhere, so a VIN could split; the date on one line (lead-inbox.tsx:95-150) | `sa-tbl`, headers in sentence case, `ad-link`, the VIN on one line, „Оферта" right-aligned, the open lead's row marked (`ad-tr-sel`) | As drawn; sentence case (decision 10). The VIN stays whole; the name, phone and car wrap instead |
| 10 | Columns: Carfax Име, Телефон, VIN, Автомобил; consultations Име, Телефон, Интерес, Бюджет; offers Име, Телефон, Пазар, Оферта; „—" for a missing car, interest or budget; the offer total in USD „17 879 $" (admin-lead-view.ts:41-43, 66-195) | the same | — |
| 11 | The pager, its links keeping the filters (lead-inbox.tsx:49-55, 154) | `ad-pager` (`ad-inquiries-list` 4) | Built with the shell |
| 12 | The detail drawer: Base UI's drawer from the right, focus held inside, Escape, the backdrop and a swipe to the right close it, the page doesn't scroll behind it, portaled; full width on a phone, 32rem from there (lead-detail-drawer.tsx) | `ad-dw`, 512 px; full screen on a phone (`ad-carfax-phone`) | As drawn; Base UI's drawer and its behaviour kept |
| 13 | The drawer's head: „{тип} · #{id}" (capitals through CSS), the name as the title, the status, „Затвори" (aria) (lead-detail-drawer.tsx:70-85) | the eyebrow in sentence case, the title in the display face, the kit's tag, a ghost icon button „Затворете" | Formal „Затворете" (decision 1); sentence case |
| 14 | The drawer's fields, one list: the lead's fields, then the offer's price, total and breakdown lines (€ or $ as stored), „Тарифи към" as stored („21.07.2026"), then the page (new tab), IP, received and updated; the phone `tel:`, the e-mail `mailto:`; the VIN and the IP in mono (admin-lead-view.ts) | three lists: the lead's fields; an offer's amounts right-aligned with „Обща оферта" larger; the page, IP and times. „Марка" with the make's plate, „Пазар" with the flag | As drawn; the same rows in the same order |
| 15 | „Статус" (capitals through CSS) and the shared dropdown in its old look, „Статус на заявката", five options; a pick shows at once and saves, the field locked while it saves, back to the old value on a failure with the message under it („Връзката прекъсна — статусът не е сменен." or the server's); the drawer stays open and the page refreshes (status-select.tsx; lead-detail-drawer.tsx:95-98) | `ad-box` with the kit's dropdown (`ad-inquiries-status`) | As drawn: the dropdown's kit look; sentence case |
| 16 | „Бележки" (capitals through CSS), 4 rows, „Добавете бележки за проследяване на този контакт…"; „Запази бележки" off until the text changes; „Запазване…" while it saves; „Запазено"; „Връзката прекъсна — бележките не са запазени." or the server's message; blank notes clear the field; the page refreshes (notes-editor.tsx) | `ad-notes`: the kit's field, a primary button with a spinner, „Запазено" with a tick, the error with an icon (`ad-inquiries-notes` 1–4) | Formal „Запазете бележки" (decision 1); as drawn |
| 17 | Closing with an unsaved note (✕, Escape, the backdrop, a swipe) asks first: „Бележката не е запазена", „Ако затворите, написаното ще се загуби.", „Върни се", „Затвори без запазване"; its backdrop never showed, because Base UI leaves a nested dialog's backdrop out (lead-detail-drawer.tsx:51-58, 107-135) | the kit's dialog over a scrim that covers the drawer too (`ad-inquiries-notes` 5) | Formal „Върнете се", „Затворете без запазване" (decision 1); as drawn, the backdrop forced (`forceRender`) |
| 18 | The drawer stays on a lead that the refreshed list no longer shows, with its new status (lead-inbox.tsx:38-43, 157-163) | `ad-inquiries-kept` | Kept |
| 19 | `updateLead`'s messages: „Нямате достъп до тази операция.", „Възникна грешка при запазването. Моля опитайте отново.", and four only a forged request can reach (update-lead.mutation.ts) | `ad-errors` | Kept as written |
| 20 | Dates in Sofia time („26.10.2026 г., 11:42") (admin-lead-view.ts:16-18) | the same | — |
| 21 | White cards, table and drawer | the night ground, `sa-pnl`-style surfaces | The kit's |
