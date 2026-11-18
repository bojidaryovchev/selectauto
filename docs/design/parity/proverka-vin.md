# VIN check · `/proverka-vin`

- Boards: `in-vin` (d, t, p), `in-vin-flow` (phone flow: invalid VIN, checking, records, no records, unavailable, too
  many requests), `in-vin-msgs` (fixed: every message, both result titles), `in-vin-dlg`, `in-vin-carfax` (the Carfax
  dialog, see [carfax.md](carfax.md)). The design run's notes: `D:/design/selectauto/notes/in.md` §1, §2.
- Code on main, read in full: `app/proverka-vin/page.tsx`, `components/carfax/vin-check-tool.tsx`,
  `schemas/vin-check.schema.ts`, `app/api/vin-check/route.ts`.
- Checked before building: 18.11.2026 · Walked after building: 18.11.2026, at 1440 and 390, every POST mocked: a
  16-character VIN gave the client error; checking showed „Проверявам…" and the placeholder; 47 / 56 records the
  pills and the primary „Заявете пълен Carfax" with „Проверете" secondary, and the dialog with the VIN locked; no
  records „VIN: …" and the info alert; 429 the yellow alert; 502 the red one.

## What the code does today

| # | What the code does today (file:line) | On the board | Outcome |
|---|---|---|---|
| 1 | Metadata „VIN проверка на автомобил — безплатно \| SelectAuto", „…— виж дали има … преди да купиш. Заяви пълен доклад…", share „…Виж и как…" (page.tsx:23-36) | `info-meta` | Formal „вижте … купите. Заявете…", „Вижте и как…" |
| 2 | JSON-LD: BreadcrumbList, FAQPage from the five answers, WebApplication (page.tsx:73-88) | `info-meta` (the JSON-LD text) | Kept; the FAQPage follows the formal first answer |
| 3 | A visible breadcrumb; H1 „Безплатна VIN проверка на автомобил" (capitals through CSS); „Провери … Въведи … ще видиш … заяви…" (page.tsx:91-106) | the hero band with the tool beside the text | Sentence case; formal „Проверете … Въведете … ще видите … заявете…" |
| 4 | Tool: the field (17 characters, its name „VIN номер"), „Провери" / „Проверявам…" while checking; the client check „Въведете валиден 17-значен VIN номер (без I, O, Q)."; POST `/api/vin-check` (vin-check-tool.tsx) | a search field and the primary xl button; the error under the field | Formal „Въведете VIN номер (17 символа)", „Проверете"; the request unchanged |
| 5 | While checking: nothing in the result's place | `in-vin-flow` 2: a placeholder of the result | As drawn |
| 6 | Result: the vehicle's name or „VIN: …"; with records „Carfax записи: N", „AutoCheck записи: N", „За този автомобил има налична история. Заяви … ще получиш…" and „Заяви пълен Carfax" → the Carfax dialog with the VIN locked; without records „…Провери номера или се свържи с нас…" (vin-check-tool.tsx:107-145) | frames 3–4: count pills, the primary block button with a shield; the info alert | Formal „Заявете … ще получите…", „Заявете пълен Carfax", „Проверете … свържете…". With records „Проверете" turns secondary, so the view has one primary action |
| 7 | Errors in red text: the server's („Твърде много заявки. Опитайте отново след минута.", „В момента проверката не е достъпна. Опитайте отново по-късно.", „Невалидна заявка.", the schema's), „Проверката не бе успешна.", „Възникна грешка. Опитай отново." (vin-check-tool.tsx:47-66, route.ts) | frames 5–6, `in-vin-msgs`: a red alert, a yellow one with a timer for 429 | As drawn; formal „Опитайте отново." in the client's own message |
| 8 | The hint „Проверката показва наличността на записи…" (vin-check-tool.tsx:147-150) | under the tool | — |
| 9 | „Защо да провериш VIN преди покупка": four cards (page.tsx:114-128) | four kit panels with icons | Formal „…да проверите…" |
| 10 | „VIN проверка на кола от Корея": two paragraphs and two links (page.tsx:131-163) | a band with the Korean flag, secondary buttons | As drawn; the text as written |
| 11 | FAQ: five questions, every answer shown (page.tsx:166-176) | panels in two columns, always open | As drawn |
| 12 | CTA „Искаш пълния Carfax доклад?", „Заяви … да вземеш решение.", „Заяви Carfax проверка" (capitals through CSS) → /carfax (page.tsx:179-195) | a panel, the primary xl button with a shield | Formal „Искате…", „Заявете … да вземете…", „Заявете Carfax проверка" |
| 13 | A light page ground | the night ground | The shell's |
