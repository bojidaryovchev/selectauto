# Contract form · `/admin/dogovori/nov` and the edit on `/admin/dogovori/[id]` (`contract-form.tsx`)

- Boards (admin canvas): `ab-contract-new` (d, t, p: САЩ, existing client, a cross-currency deposit), `-new-kr`,
  `-new-ca` (a new company client, the CAD row's field error), `-new-ca2` (two deposits), `-new-eu` (three points,
  every placeholder), `-new-flow` (phone flow with the sticky total), `ab-contract-edit` and `-edit-states` (the edit
  card: saving, refused, saved, a Канада edit), `ab-messages`. The design run's notes: `D:/design/selectauto/notes/ab.md`
  (rows 54–57, 58 edit, sections 2 and 4).
- Code on main, read in full: `app/admin/dogovori/nov/page.tsx`, `components/admin/contracts/contract-form.tsx`,
  `schemas/contract.schema.ts`, `schemas/client.schema.ts`, the messages of `mutations/contracts/{create,update}-contract.mutation.ts`,
  `constants/contracts.ts` (markets, points, statuses).
- Checked before building: 18.11.2026 · Walked after building: 18.11.2026 (create; the edit is walked with the
  contract page) on the local build, signed in as a real admin; `createContract` answered by a mock or cut off, so
  nothing written. Walked: `/nov` at 1440, 820, 390 and 320 (the car in 3, 2 and 1 columns, no sideways scroll, no
  label on two lines); an empty submit (the client, year, make and model messages under their fields, nothing sent);
  a real client with a paid EUR deposit on a САЩ contract (the box, the tick, „Сума за приспадане в USD *" and its
  hint, the orange line under Точка 1); Канада without the CAD amount (both CAD fields outlined, „Въведете сумата в
  канадски долари."), then 18600 × 0.62 → „= 11 532,00 EUR" and the total; created (to the new contract's page),
  refused („Депозитът за приспадане (1080,00 USD) …" in the bar) and with no connection; the bar stuck to the bottom of
  a phone's screen.

## What the code does today

| # | What the code does today (file:line) | On the board | Outcome |
|---|---|---|---|
| 1 | `/nov` needs `contracts.create`; „Всички договори" back link, „Нов договор" and its paragraph; tab title „Нов договор" (nov/page.tsx) | `ad-ph` with the back link | — |
| 2 | Four cards „1. Тип договор", „2. Клиент", „3. Автомобил", „4. Финансови точки ({валута})" (no numbers and no client card when editing) (contract-form.tsx:241-647) | `ab-fcard` panels on `ab-form` | As drawn |
| 3 | The market as radio pills „САЩ (USD)", „Канада (EUR)", „Южна Корея (EUR)", „Европа (EUR)"; when editing „{пазар} — валута … (типът не се променя след създаване)"; „Дата на договора" (a date field) with „Оставете празно за днешна дата."; when editing „Статус" with the four statuses (contract-form.tsx:244-296) | `ab-chiprow`, the kit's fields | — |
| 4 | „Съществуващ клиент" / „Нов клиент"; „Клиент" with „— изберете клиент —"; for a client with paid deposits „Клиентът има платен депозит — да се приспадне от плащане „Кола“?" and a checkbox per deposit „Депозит № … — …"; across currencies „Сума за приспадане в {валута} *" with its hint and placeholder; a new client: „Тип клиент", „Три имена *" / „Име на фирмата *", „ЕГН *" / „ЕИК *", „ДДС номер", „Представител", „Адрес" / „Адрес на управление", „Телефон", „Имейл" (contract-form.tsx:300-494) | `ab-depo` on the orange tint with the kit's checkboxes; the kit's fields in two columns | As drawn |
| 5 | The car: „Година *", „Марка *", „Модел *", „VIN" (17 characters, capitals), „Държава / пазар на покупка" („напр. САЩ"), „Търг / платформа" („напр. Copart 46274725") (contract-form.tsx:496-562) | three columns from a 768 px form | — |
| 6 | The market's points (5, 4 or 3), „0.00"; Канада's Точка 1 in CAD: amount, rate, „= … EUR" and its hint; „− Депозит № … (…) ще се приспадне от това плащане."; „Основание за плащане" („автоматично: Договор № …") (contract-form.tsx:564-647) | `ab-cad` / `ab-derived`; the deposit line in orange | — |
| 7 | A sticky bar: „Обща сума: …" live, „Създай договор" / „Запази промените" / „Запазване…"; created → the new contract's page; edited → the page refreshes; the first schema or server message in a red banner in the bar; „Възникна грешка при запис. Моля опитайте отново." without a connection (contract-form.tsx:160-237, 649-664) | `ab-dock`, sticky; the total in the display face; a spinner while saving; each schema message under its field (the CAD amount outlined with „Въведете сумата в канадски долари."); the bar keeps the server's refusals and the network | Formal „Създайте договор", „Запазете промените" (decision 1); as drawn: the form runs the server's own schema first (`noValidate`), the server re-checks |
| 8 | The server's deposit message „Депозитът за приспадане (1080.00 USD) е по-голям от Точка 1 (0.00 USD) — …" (create-contract.mutation.ts:160) | „(1080,00 USD) … (0,00 USD)" | Changed to `formatCents` (decision 11, readable admin amounts) |
| 9 | Light cards and bar | the night ground | The kit's |
