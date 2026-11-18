# Deposits · `/admin/depoziti` (`components/admin/deposits`)

- Boards (admin canvas): `ab-deposits` (d, t, p), `ab-deposits-sup` (d, t, p), `ab-deposits-form` (d, t, p),
  `ab-deposits-empty` (d, t, p), `ab-deposits-empty2` (d, t, p), `ab-deposits-states` (sheet: each status's row,
  status saving and its errors, the document generating and its errors, delete refused, the observer, the form's
  field errors, a company deposit saving), `ab-deposits-flow` (flow), `ab-dialogs`, `ab-messages`. The design run's
  notes: `D:/design/selectauto/notes/ab.md` (rows 66–70, sections 2 and 4).
- Code on main, read in full: `app/admin/depoziti/page.tsx`, `components/admin/deposits/*`,
  `components/admin/contracts/numbering-settings.tsx` (shared, rebuilt with the register), `schemas/deposit.schema.ts`,
  `schemas/client.schema.ts`, and the messages of `mutations/deposits/create-deposit.mutation.ts`.
- Checked before building: 18.11.2026 · Walked after building: 18.11.2026 on the local build, signed in as a real
  admin, supervisor and observer; every action answered by a mock or cut off, so nothing written. Walked: the page at
  1440, 1100, 820, 390 and 320 (the table from a 56rem list, cards below, no sideways scroll, no label on two lines;
  „17.11.2026 г."; every status in its colour; „Използван по Договор № …"; the version links); the supervisor (no
  numbering, no status select) and the observer (no numbering, the form open over „Още няма договори за депозит.");
  the form's checks under their fields (no client; then a new client's name, ЕГН „123", budget „abc", amount „0"),
  nothing sent until they pass; created (the form starts over, the success alert), refused and with no connection;
  a row's status saving (locked), refused and with no connection; a new version's dialog, generated (the PDF opened
  in a new tab), refused and with no connection (the dialog now closes); deleting a cancelled deposit with no
  connection (the dialog closes, „Грешка при запис.").

## What the code does today

| # | What the code does today (file:line) | On the board | Outcome |
|---|---|---|---|
| 1 | Back office; each sees only the deposits they may; creating and printing for `contracts.create`, the status for `deposits.manage` (admin), numbering for `contracts.edit`; tab title „Депозити" (page.tsx) | `ab-deposits`, `-sup`, `-empty` | Kept |
| 2 | „Договори за депозит" and its paragraph (page.tsx:37-40) | `ad-ph` | — |
| 3 | The deposit series' numbering (page.tsx:42) | `ab-numb` (`ab-deposits-form`) | Built with the register |
| 4 | „＋ Нов договор за депозит", folded, open while the list is empty (page.tsx:47-57) | `ab-disc` with a plus icon | As drawn: the glyph an icon (decision 10) |
| 5 | The form: „Съществуващ клиент" / „Нов клиент" as radio pills; „Клиент" with „— изберете клиент —" and „{име} (ЕГН …)" / „(ЕИК …)"; a new client's „Тип клиент", „Три имена *" or „Име на фирмата *", „ЕГН *" or „ЕИК *", „Адрес", „Телефон", „Имейл"; „Дата (празно = днес)" (a date field), „Описание на МПС" („ЛЕК АВТОМОБИЛ"), „Бюджет" („напр. 8500") with „Валута на бюджета и депозита" (EUR, USD), „Сума на депозита * (мин. 500 евро по шаблон)" (500); „Създай депозит" / „Запазване…" (deposit-form.tsx) | `ab-depf` in two columns from a 512 px form, the kit's fields, chips and selects | Formal „Създайте депозит" (decision 1); as drawn |
| 6 | The first message of the schema or the server in a red banner, „Възникна грешка при запис. Моля опитайте отново." without a connection; created: the form starts over and „Договор за депозит № … е създаден — вижте го в списъка." (deposit-form.tsx:61-113, 295-298) | each schema message under its field („Изберете клиент или въведете нов.", „ЕГН трябва да е точно 10 цифри." …), the banner for the server and the network (`ab-deposits-empty`, `-states`, `-form`) | As drawn: the form runs the same `createDepositSchema` before sending; the server re-checks |
| 7 | Cards below a 56rem list (two columns from 36rem), the table above; a card: „Депозит № …", the date as stored („2026-10-25"), the status, the client, „{МПС} · Бюджет: …", „Депозит: …", „Използван по Договор № …", the actions; the table: „Депозит", „Клиент и МПС", „Сума", „Статус", „Действия" (capitals through CSS) (deposit-list.tsx) | `ab-list`; the number in mono, „25.10.2026 г.", the kit's tags, the link with a document icon | As drawn: readable dates (decision 11), sentence case |
| 8 | The document: „Договор (PDF)" (primary) or „Нова версия", „Генериране…"; „в.N ({дата}) ⬇" per version (new tab); „Грешка при генериране." or the server's message; a new version asks „Нова версия на договора за депозит?", „Вече има N генерирана(и) версия(и). Старите се запазват и остават достъпни за изтегляне.", „Генерирай нова версия"; the new PDF opens in a new tab (deposit-document-button.tsx) | a secondary button with a file-plus icon and a spinner; the versions as text links with a download icon; the error with an icon | Formal „Генерирайте нова версия"; the glyph an icon; secondary, one primary per view (notes ab §4). **Fixed:** a new version that loses the connection now closes the dialog, so its „Грешка при генериране." shows; it stayed open over the error |
| 9 | The status (admin): „Статус на депозит № …" for screen readers, every status but „Използван" (set only by a contract), nothing for a used deposit; a change saves at once, locked meanwhile; „Грешка при запис." or the server's („Използван депозит не може да се променя."); „Изтрий" (danger) on a cancelled one → „Изтриване на депозит № …?", „Действието е необратимо — заедно с депозита се изтрива и генерираният договор.", „Изтрий" (deposit-row-actions.tsx) | the kit's select; „Изтрийте" with a bin icon; the errors with icons (`ab-deposits-states`, `ab-dialogs`) | Formal „Изтрийте" (decision 1); as drawn. **Fixed:** a delete that loses the connection now says „Грешка при запис." and closes the dialog; it stayed open without a word |
| 10 | „Още няма договори за депозит." (page.tsx:63) | `ab-empty` with a wallet icon | As drawn |
| 11 | Light cards and table | the night ground | The kit's |
