# Contract page · `/admin/dogovori/[id]` (page, `payment-stage-card`, `contract-admin-tools`, `contract-document-button`)

- Boards (admin canvas): `ab-contract` (d, t, p), `-eu`, `-paid`, `-obs` (observer, Канада), `-edit` and
  `-edit-states`, `-stages` and `-stages2` (every stage state and the legend), `-panels`, `-panels2`, `-parts`,
  `-panels3` (notice, preview, payment, document and tools states), `-flow`, `-flow2`, `-paid-flow`, `-del-flow`
  (phone flows), `ab-dialogs`, `ab-messages`. The design run's notes: `D:/design/selectauto/notes/ab.md` (rows 58–65,
  sections 2–4).
- Code on main, read in full: `app/admin/dogovori/[id]/page.tsx`, `components/admin/contracts/{payment-stage-card,
  contract-admin-tools,contract-document-button,notice-sent-button,payment-status-badge}.tsx`, `queries/contracts/get-contract.query.ts`
  (the id check), `constants/contracts.ts`, `constants/audit.ts` (labels).
- Checked before building: 18.11.2026 · Walked after building: 18.11.2026 on the local build, signed in as a real
  admin and supervisor on contracts 88 and 78; every action answered by a mock or cut off (uploads included), so
  nothing written. Walked: the page at 1440, 1100, 820 and 390 (cards in 3, 2, 2 and 1 columns, stages in 2, 2, 2
  and 1; no sideways scroll; no label on two lines; „13.11.2026 г.", „Падеж: 23.11.2026 г."; the plate; the total);
  the supervisor (the document button primary, „Отбележете като изпратено" on the notice to send, no stage actions,
  attaching, no edit or tools); a notice: the panel, „Изчисляване…", the preview with the rate line, the total and
  the note, the PDF opened in a new tab; a refused and a lost preview; a payment: the kit's file button („Няма
  избран файл", then the name), the 4 MB check before anything is sent, saved with the proof (two requests), and with
  no connection; a revert with no connection (the dialog closes, the message shows); the edit (no numbers on the
  cards, „НЕ" in bold, „Запазете промените" sent); the tools (the number in mono, „Запазете номера" off until it
  changes, a refusal in the alert, „Изтрийте договора" off for an active contract); the id 9007199254740993 now the
  admin 404.

## What the code does today

| # | What the code does today (file:line) | On the board | Outcome |
|---|---|---|---|
| 1 | Back office; `getContract` 404s a contract the user may not see; tab title „Договор" (page.tsx; get-contract.query.ts) | `ad-404` | Kept. **Fixed:** an id above 2 147 483 647 overflowed the column and showed the error page; it now answers „Няма такъв запис" like any missing id |
| 2 | „Всички договори", „Договор № …" with the status pill, „{пазар} ({валута}) · Дата: 2026-10-14" (page.tsx:76-88) | `ad-ph`, the kit's tag, „14.10.2026 г." | As drawn: readable dates (decision 11) |
| 3 | „Генерирай договор (PDF)" (primary) or „Генерирай нова версия", „Генериране…"; „Версия N ({дата}) ⬇" (new tab); „Възникна грешка при генерирането." or the server's; a new version asks „Нова версия на договора?" … „Генерирай нова версия"; open to observers (contract-document-button.tsx) | `ab-docs`: secondary with a file-plus icon (primary only for an observer, whose only action it is), versions as text links with a download icon | Formal „Генерирайте договор (PDF)", „Генерирайте нова версия" (decision 1); the glyph an icon. **Fixed:** a new version that loses the connection closes its dialog, so the error shows |
| 4 | Three cards: „Клиент" (Тип, Име/Фирма, ЕГН, ЕИК, ДДС №, Представител, Адрес, Телефон, Имейл), „Автомобил" (the car, VIN in mono, Пазар, Търг), „Финансови точки" (each point, Канада's „(… CAD × курс …)", „Депозит № …" −…, „Обща сума"); 1, 2, then 3 columns by the page's width (page.tsx:95-167) | `ab-dgrid` of `ab-dcard` panels, the make's plate, the total in the display face, the deposit line in orange | As drawn (decision 8 for the plate) |
| 5 | „Плащания": a card per stage, one column, two from 42rem (page.tsx:169-195) | `ab-stgg`: two columns from 672 px, four from 1500 px | As drawn |
| 6 | A stage card: its name, the status, the description, the due sum, „Получател:" (or „— не е избран —"), „Основание:", „Падеж:", „Платено: … (дата)", „Остатък:" in red, „Бележка:" (payment-stage-card.tsx:327-380) | `ab-stg`, the sum in the display face, the kit's tag, readable dates | As drawn: „Падеж" and the paid date readable (decision 11) |
| 7 | „Известия" (capitals through CSS): „Версия N — {дата и час} ⬇", „Бележка: …", „За изпращане към клиента" with „Отбележи като изпратено" for whoever forwards, „Изпратено на клиента — …"; „Прикачени документи": each file ⬇ (payment-stage-card.tsx:382-433) | `ab-box` panels, download and paperclip icons, the amber tag | Sentence case; glyphs as icons; formal „Отбележете като изпратено" |
| 8 | Actions: „Генерирай известие" (primary), „Отбележи като платено" (positive), „Върни статус" (ghost) by capability; none on a cancelled contract; „＋ Прикачи платежен документ" / „Качване…" for `payments.attach` (payment-stage-card.tsx:698-748) | „Генерирайте известие" tonal with a file-plus icon, „Отбележете като платено" secondary with a green tick, „Върнете статус" a text button with an undo icon; „Прикачете платежен документ" with a paperclip | Formal forms (decision 1); demoted to keep one primary per view (notes ab §4) |
| 9 | The notice panel: „Получател" („— изберете —", only the allowed kinds) or the fixed recipient; „Курс USD/EUR *" („напр. 0.86") with its hint for САЩ to SelectAuto; „Сума по етапа (…) — по избор / *" with its hints (the deposit, the rate); „Основание"; „Падеж (по подразбиране 10 дни)"; „Бележка — по избор" („напр. +519 EUR SSANCAR") with its hint; „Преглед →" / „Изчисляване…", „Отказ" (payment-stage-card.tsx:438-557) | `ab-panel` on the orange tint; „Преглед" with an arrow icon | The glyph an icon |
| 10 | The preview: „Преглед преди генериране", Договор / Етап / Получател, the lines with the rate, „Обща сума за плащане: …", Основание, „Бележка (не се печата): …", the version warning; „Потвърди и генерирай PDF" / „Генериране…", „← Назад"; the PDF opens in a new tab (payment-stage-card.tsx:559-626) | `ab-pv`, `ab-lines`, `ab-pvtot`, the kit's warning | Formal „Потвърдете и генерирайте PDF"; the arrow an icon |
| 11 | The payment panel: „Реално платена сума (…)", „Дата на плащане", „Бележка", „Платежен документ (PDF/снимка, до 4 MB)" (the browser's file field); „Запази плащането" / „Запазване…", „Отказ"; the 4 MB check; „Плащането е записано, но файлът не се прикачи: … Прикачете го отново с „＋ Прикачи платежен документ“." (payment-stage-card.tsx:224-275, 628-696) | `ab-panel--pos`; the file field as the kit's „Изберете файл" with the file's name or „Няма избран файл"; „Запазете плащането" positive with a tick | Formal „Запазете плащането"; the quote follows the button („Прикачете платежен документ"); the kit's file button (notes ab §2, UX addition 3) |
| 12 | „Връщане на статуса?" / „Отбелязаното плащане ще бъде изчистено, а действието остава записано в историята." (payment-stage-card.tsx:750-758) | `ab-dialogs` | Kept. **Fixed:** a revert that loses the connection closes the dialog and says „Възникна грешка. Моля опитайте отново." |
| 13 | „Редакция на договора" (folded, `contracts.edit`) with its paragraph („… НЕ се променят …") and the form (page.tsx:197-216) | `ab-disc` with a pencil icon; „НЕ" in bold | As drawn (decision 11: emphasis capitals may be bold) |
| 14 | „Административни действия": „Номер на договора", „Запази номера", its hint; „Изтриване на договора", its two texts, „Изтрий договора" (only when cancelled); the result in a banner; the delete dialog → back to the register (contract-admin-tools.tsx) | `ab-disc` with a settings icon, `ab-tools`, the number in mono, a secondary „Запазете номера", „Изтрийте договора" with a bin icon | Formal forms (decision 1). **Fixed:** a delete that loses the connection closes the dialog and says so |
| 15 | „История": time, action label, „(плащане)" / „(депозит)" / „(клиент)"; „Няма записани събития." (page.tsx:228-256) | `ab-hist` | As drawn |
| 16 | Light cards | the night ground | The kit's |

**18.11.2026.** The payment-notice note's hint reads „Само за вас — вижда се тук и в Дневник, не се печата в
известието." (the contract's „История" doesn't show it). New contract and notice documents use template revision 2
(decisions 30 and 31); documents generated earlier render as signed. A notice keeps the client's ЕГН or ЕИК, as on
`main` (decision 35 reversed decision 32, the same day).
