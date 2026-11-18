# Recipients · `/admin/poluchateli` (`components/admin/recipients`)

- Boards (admin canvas): `ad-recipients` (d, t, p), `ad-recipients-edit` (fixed 1440), `ad-recipients-states`
  (flow, 8 frames), `ad-errors`. The design run's notes: `D:/design/selectauto/notes/ad.md` (rows 77–79, sections 2–4).
- Code on main, read in full: `app/admin/poluchateli/page.tsx`, `components/admin/recipients/*`,
  `mutations/recipients/save-recipient.mutation.ts`, `queries/recipients/list-recipients.query.ts`,
  `schemas/recipient.schema.ts`, `lib/recipient-bank.ts`, `constants/contracts.ts` (the kinds).
- Checked before building: 18.11.2026 · Walked after building: 18.11.2026 on the local build, signed in as a real
  admin; every save answered by a mock or cut off, so nothing written. Walked: the page at 1440, 1100, 820 and 390 on
  the seven live recipients (one column of cards; the details in five, three, three and one columns; „Добавете
  получател" full width on a phone; no sideways scroll; no label on two lines); a new recipient (the form at the top,
  focused on its name, „Активен" ticked, the two kinds); saved empty („Моля въведете наименование." under the name,
  focused, nothing sent); „Канадски долари" as the currency and „SHBK-KRSE" as SWIFT (both messages under their
  fields, the first focused, nothing sent); the server's refusal and the lost connection in the banner; „Запазване…"
  with both buttons off; saved (the form closes). An edit in place spanning the list, at 1440 and 390, and „Отказ";
  SelectAuto's form (the fixed type, the hint, no „Активен"). On a temporary route with made-up data, deleted before
  the commit: an inactive recipient without bank data („Неактивен", the three „—", the warning) and the empty list.

## What the code does today

| # | What the code does today (file:line) | On the board | Outcome |
|---|---|---|---|
| 1 | Admins only; tab title „Получатели"; „Получатели" and its paragraph (page.tsx:7, 19, 24-27) | `ad-ph` | — |
| 2 | „+ Добави получател" (primary) opens a new form at the top, in its place (recipients-manager.tsx:31-37) | a plus icon and „Добавете получател", full width on a phone; the form focused on its name | Formal „Добавете получател", the glyph an icon (notes ad §2); the name focused, as drawn |
| 3 | „Още няма получатели." (recipients-manager.tsx:39-40) | `ad-empty` with a landmark icon | — |
| 4 | A card per recipient in kind, then name order: the name, „{вид} · {държава}", „Активен" (green) or „Неактивен", „Редактирай" (secondary); „Банка", „IBAN / Сметка" and „SWIFT / BIC" (mono), „Валута", „—" when empty (recipients-manager.tsx:42-106; list-recipients.query.ts) | `ad-rc` in `ad-rlist` (two columns from about 1200 px), the kit's tags with their dot, the details as many 170 px columns as fit | Formal „Редактирайте"; as drawn |
| 5 | Without bank data: „Липсва: банка, IBAN / сметка, SWIFT / BIC — известия за плащане към този получател няма да се генерират, докато не се попълни." (recipients-manager.tsx:89-94; lib/recipient-bank.ts) | the kit's warning in the card | — |
| 6 | „Редактирай" turns its card into the form in place, scrolled into view; one form at a time; a save refreshes the list (recipients-manager.tsx:19-56; recipient-form.tsx:58-61) | `ad-form` spanning the list | — |
| 7 | The form: „Нов получател" / „Редакция: {име}"; SelectAuto's hint; „Тип" (the two kinds an admin may add) or „SelectAuto (фиксиран)"; „Наименование *", „Държава", „ДДС / рег. номер", „Адрес" (wide), „Банка", „Адрес на банката", „IBAN / Сметка", „SWIFT / BIC", „Routing code (за неевропейски преводи)" („напр. CC000100381"), „Валута" („EUR / USD"), „Разноски на превода" („напр. За сметка на изпращача (OUR)"), „Вид плащане" („напр. BLINK"); the codes in capitals without autocorrect; „Активен — предлага се при генериране на известия" (not for SelectAuto); one column, two from 36rem (recipient-form.tsx:101-282) | `ad-fgrid`, two columns, one on a phone; the kit's select and checkbox; the codes in mono; the asterisk in orange | As drawn |
| 8 | „Запази" / „Запазване…" (primary), „Отказ"; the browser's bubble for an empty name; the first message of the schema or the server in one banner at the bottom; „Връзката прекъсна — получателят не е запазен. Опитайте отново." (recipient-form.tsx:63-97, 284-293; save-recipient.mutation.ts) | each schema message under its field (outlined, `aria-invalid`), the server's refusals and the lost connection in the banner; „Запазете" with a spinner | Formal „Запазете" (decision 1); `noValidate` and the shared schema first, the server re-checks (notes ad §4 decisions 4 and 11) |
| 9 | A value over its limit: zod's English „Too big: expected string to have <=10 characters" in the banner (schemas/recipient.schema.ts) | its own message under the field („Валутата може да съдържа най-много 10 знака.") | Owner decision 12: one Bulgarian length message per field, in the schema |
| 10 | The server's guards: SelectAuto can't be added again, change kind or be deactivated; „Само фиксираният запис може да бъде от тип SelectAuto."; „Получателят не е намерен."; „Невалиден идентификатор."; „Възникна грешка при запазването. Моля опитайте отново." (save-recipient.mutation.ts) | `ad-errors` | — |
| 11 | Light cards | the night ground | The kit's |
