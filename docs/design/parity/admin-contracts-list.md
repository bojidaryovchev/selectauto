# Contracts register · `/admin/dogovori` (`components/admin/contracts`: list, filters, numbering, to-send list)

- Boards (admin canvas): `ab-contracts` (d, t, p), `ab-contracts-sup` (d, t, p), `ab-contracts-filter` (d, t, p),
  `ab-contracts-states` (sheet: numbering saving, its field error, a new year; marking a notice sent, its two errors,
  the marked one leaving), `ab-contracts-empty` (d, t, p), `ab-messages`. The design run's notes:
  `D:/design/selectauto/notes/ab.md` (rows 50–53, sections 2 and 4).
- Code on main, read in full: `app/admin/dogovori/page.tsx`, `components/admin/contracts/{contract-list,
  contract-filters,numbering-settings,notices-to-send,notice-sent-button,payment-status-badge}.tsx`,
  `constants/contracts.ts` (statuses, stages, markets), `mutations/contracts/set-next-number.mutation.ts` (messages).
- Checked before building: 18.11.2026 · Walked after building: 18.11.2026 on the local build, signed in as a real
  admin, supervisor and observer; numbering and „Отбележете като изпратено" answered by mocks or cut off, so nothing
  written. Walked: the register at 1440, 1280, 1100, 820, 390 and 320 (the table from a 56rem list, cards below; the
  number in mono, „17.11.2026 г.", the market, the plates, the VIN, the total, the stage chips and the status in their
  colours; no sideways scroll; no label on two lines); the numbering's field check („0" stopped with the server's
  message under the field and „→ 2026-001", nothing sent), saving, saved („Следващият договор ще бъде № 2026-140."),
  refused and with no connection; the to-send list folded for the admin and open for the supervisor (40 notices),
  marking one sent (saving, refused „Известието не е намерено.", no connection „Грешка при запис."); the observer
  with no contracts (no numbering, no list, „Няма договори." with the hint and an icon); a status filter with
  „Изчистете", a search that finds nothing. With real names the chips stack one per line (the board's sample names are
  short); main's chips stopped at 22rem and stacked the same way.

## What the code does today

| # | What the code does today (file:line) | On the board | Outcome |
|---|---|---|---|
| 1 | Anyone in the back office; each sees only the contracts they may (`listContracts`); tab title „Договори" (page.tsx) | `ab-contracts`, `-sup`, `-empty` | Kept |
| 2 | „Договори", „Договори за посредничество — общо N." (the filtered count), „+ Нов договор" (primary, lg) for `contracts.create` (page.tsx:52-63) | `ad-ph`; a plus icon and „Нов договор" | As drawn: the plus glyph an icon (decision 10) |
| 3 | Numbering, for `contracts.edit` only: „Следващ номер: 2026-134 (последен използван: 2026-133)", folded; „Промени номерацията" / „Затвори"; „Номер на следващия договор за 2026 г.", „2026-", a number field 1–99999 (the browser's own check), „→ 2026-134", „Запази" (primary) / „Запазване…"; the hint; „Следващият договор ще бъде № ….", the server's errors or „Възникна грешка. Моля опитайте отново." in a banner (numbering-settings.tsx) | `ab-numb`: a text button, a secondary „Запазете" with a spinner, the number error under the field, the result in an alert (`ab-contracts-filter`, `-states`) | Formal „Променете номерацията", „Затворете", „Запазете" (decision 1); as drawn. The 1–99999 rule is checked in the form before sending, with the server's own message under the field („Номерът трябва да е цяло число между 1 и 99999."), not the browser's bubble (`noValidate`) |
| 4 | „Известия за изпращане към клиента (N)" when there are any: open for whoever marks them sent, folded for the one who issues them; each row „Договор № …" (link), „{клиент} · {етап} · версия N от {дата}", „PDF ⬇" (new tab), and „Отбележи като изпратено" / „Запазване…" with its error („Грешка при запис." without a connection, or the server's) (notices-to-send.tsx; notice-sent-button.tsx) | `ab-send` on amber; „PDF" with a download icon; a secondary button with a green tick; the error on its own line (`ab-contracts-sup`, `-states`) | Formal „Отбележете като изпратено" (decision 1); the glyph an icon; as drawn |
| 5 | Filters as a plain GET form: „Търсене: №, VIN, марка, клиент…", a status select („Всички статуси" + four), „Филтрирай" (primary), „Изчисти" when filtered (contract-filters.tsx) | `ab-filt`: a search icon, the kit's select, a secondary „Филтрирайте" with a filter icon, „Изчистете" | Formal „Филтрирайте", „Изчистете" (decision 1); as drawn |
| 6 | Cards while the list is narrower than 56rem (two columns from 36rem), a table above, by the list's own width (contract-list.tsx:41-52) | `ab-list` with the same container widths | — |
| 7 | A card: „№ 2026-133", the date as stored („2026-10-24"), the market, the status; the client, the car, the VIN in mono; the total „16 555,00 EUR"; a chip per stage the market has, „Кола: Не е поискано"; the whole card opens the contract (contract-list.tsx:55-88) | `ab-cc`: the number in mono, „24.10.2026 г.", the make's plate beside the car, the kit's tags with dots | As drawn: readable dates (decision 11); the plates (decision 8) |
| 8 | The table: „Договор", „Клиент и автомобил", „Обща сума", „Плащания", „Статус" (capitals through CSS); only the number links (WebKit bug 240961 with a row-wide link) (contract-list.tsx:90-147) | `sa-tbl` in sentence case | As drawn; the number stays the only link |
| 9 | Statuses: Чернова, Активен, Напълно платен, Анулиран; stages: Не е поискано, Очаква плащане, Частично платено, Платено, Просрочено, Анулирано, each a coloured pill (constants/contracts.ts) | the kit's tags: Чернова outlined, Активен and Частично платено blue, Напълно платен and Платено green, Очаква плащане amber, Просрочено red, the rest neutral | As drawn, each colour with its word |
| 10 | Empty: „Няма договори по зададените филтри." or „Няма договори.", with „Създайте първия с „+ Нов договор“." for `contracts.create` (page.tsx:68-72) | `ab-empty` with a search or a document icon | As drawn; the hint keeps its „+" (it quotes the code) |
| 11 | The pager, keeping the filters (page.tsx:38-45, 74) | `ad-pager` | Built with the shell |
| 12 | Light cards and table | the night ground | The kit's |

**18.11.2026.** A status tag's prefix („Кола:") is set apart by weight only: at 82 % opacity the red one was 4.15:1 on
its tag (axe), under the 4.5:1 text needs.
