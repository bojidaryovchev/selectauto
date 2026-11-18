# Tariffs · `/admin/tarifi` (`calc-config-form`, `tariff-upload-form`, `tariff-history`)

- Boards (admin canvas): `ab-tariffs` (d, t, p), `ab-tariffs-check` (d, t, p), `ab-tariffs-states`, `-states2`,
  `-states3` (sheets), `ab-tariffs-flow` (phone flow), `ab-dialogs`, `ab-messages`. The design run's notes:
  `D:/design/selectauto/notes/ab.md` (rows 71–75, sections 2–4).
- Code on main, read in full: `app/admin/tarifi/page.tsx`, `components/admin/{calc-config-form,tariff-upload-form,
  tariff-history}.tsx`, `mutations/tariffs/*`, `queries/tariffs/*`, `schemas/calc-config.schema.ts`,
  `lib/{tariff-parse,tariff-diff}.ts`.
- Checked before building: 18.11.2026 · Walked after building: 18.11.2026 on the local build, signed in as a real
  admin. The table check ran for real (it parses the paste and reads the active table, writing nothing); the
  settings save, the upload and the activation were answered by mocks or cut off, so nothing written. Walked: the page
  at 1440, 1100, 820 and 390 on today's data (no settings saved yet: „Още не са променяни — …"; the built-in table
  active and the only version; the fields in 3, 2, 2 and 1 columns, 44 px with 16 px text; the paste areas 13 px,
  16 px on a phone; the bar sticky; no sideways scroll; no label on two lines); a change and „Върнете"; „Курс
  EUR→USD: между 0,1 и 10." under its field, focused, nothing sent, kept on leaving the field, gone on typing; an
  emptied field and Enter („Мито: въведете число."), then its value back and the message gone on leaving it;
  saving, saved, „Нямате достъп до тази операция.", the lost connection. Pastes made from the built-in table: only the
  transport table, no header row, five rows (the parser's messages); identical („Таблиците съвпадат с активната —
  …"); three yards gone, twelve prices and two container prices changed (the counts, the groups, the dialog); saved
  („Готово — …", the areas cleared); an edit dropping the check; a save with no connection. On a temporary route with
  two made-up versions, deleted before the commit: „Активна", „Активирайте", the dialog, „Моля изчакайте...",
  refused, the built-in table's dialog, the lost connection, the phone.

## What the code does today

| # | What the code does today (file:line) | On the board | Outcome |
|---|---|---|---|
| 1 | Admins only; tab title „Тарифи"; „Тарифи" and its paragraph (page.tsx:9, 30, 36-39) | `ad-ph` | — |
| 2 | „Настройки на калкулатора": „Такси, комисионни, транспорт, мито/ДДС и валутен курс. Последна промяна: {дата} · {кой}." or „Още не са променяни — в сила са вградените стойности." (page.tsx:41-54) | `ab-tsec` | — |
| 3 | Eight groups („Общи (мито, ДДС, курс)" … „mobile.bg — надценка при публикуване"), each field with its unit in brackets, the commission limits as „При цена до 10 000 €"; one column, two from a 32rem form, three from 56rem; the markup hint (calc-config-form.tsx:91-100, 143-288) | `ab-cfg` panels, units dimmed, two columns from 512 px, three from 896 | As drawn |
| 4 | Each value a number field (decimal keyboard, any step) with the server's limits as `min`/`max` and `required`, so the browser's bubble stops a save; an emptied field keeps its saved value and gets it back on leaving the field (calc-config-form.tsx:39-89) | the field outlined, `aria-invalid`, the schema's message under it („Курс EUR→USD: между 0,1 и 10."), the save stopped before the server; an emptied field as today | As drawn (notes ab §2 code changes, §4 decision 10): `noValidate`, the server's own schema runs in the form first, each message under its field; a field left empty at saving gets the schema's „…: въведете число." where the bubble used to stop it; the server re-checks |
| 5 | The sticky bar: „Има незапазени промени." / „Няма незапазени промени." (announced politely), „Върни" (secondary, off with nothing to undo or while saving), „Запази настройките" / „Запазване…" (primary); saved: „Запазено — калкулаторът и mobile.bg вече ползват новите стойности."; the server's refusal; „Връзката прекъсна — настройките не са запазени. Опитайте отново." (calc-config-form.tsx:122-139, 290-318) | `ab-dock`, sticky on a phone, an undo icon, the two buttons stacked on a phone | Formal „Върнете", „Запазете настройките" (decision 1) |
| 6 | „Транспортна таблица (САЩ/Канада)": „Цените по локация от CargoLoop. Активна е версията от {дата}." or „Активна е вградената таблица." „Нова версия се проверява срещу активната, преди да влезе в сила." (page.tsx:56-68) | `ab-tsec` | — |
| 7 | The paste: the instructions with „заедно със заглавния ред" in bold, „Транспортна таблица (inland, +$235)" and „Контейнерна таблица (+$105)" (monospace, no wrapping, 16 px on phones and iOS), their ⇥ placeholders, „Бележка (по избор)" („напр. Тарифи от 01.08.2026"); „Провери таблиците" / „Проверка…" (primary); the refusal or the result in a banner (tariff-upload-form.tsx:98-160) | `ab-upl`, `ab-tsv` | Formal „Проверете таблиците" |
| 8 | Editing either table after a check drops it: what goes live is what was checked (tariff-upload-form.tsx:46-50) | — | Kept |
| 9 | The check: „Проверка", „Сега" / „След активиране" (the version or „вградената таблица", rows, container prices), „1 локация няма да има / N локации няма да имат транспортна цена — …", „Таблиците съвпадат с активната — цените няма да се променят.", the five counts (the second amber above 0), the four folded groups with „…: from → to" and „…и още N"; „Запази и активирай" / „Запазване…" (primary), „Откажи" (secondary) (tariff-upload-form.tsx:163-179, 196-283) | `ab-check`, `ab-cmp`, `ab-stats`, `ab-diff` with a chevron | Formal „Запазете и активирайте", „Откажете" |
| 10 | Locations losing their price ask first: „Да активирам ли таблицата?", „1 локация остава / N локации остават без транспортна цена — …", „Активирай" (danger); the dialog closes before the save (tariff-upload-form.tsx:67-91, 181-190) | `ab-dialogs`, `ab-tariffs-states3` | Formal „Активирайте" |
| 11 | Saved: „Готово — активирана е новата версия: N транспортни реда, N контейнерни цени.", the fields cleared (tariff-upload-form.tsx:72-82) | `ab-tariffs-states2` | — |
| 12 | „Версии": each upload (its note, or „Поставени тарифи (N реда)"), „{дата} · {кой} · N реда, N контейнерни цени", then „Вградена таблица" („в кода на сайта · …"); „Активна" (green) or „Активирай" (secondary); „Да активирам ли версията от {дата} / вградената таблица?", „Калкулаторът, офертите по имейл и mobile.bg ще смятат транспорта по нея от следващото зареждане.", „Активирай", „Моля изчакайте..."; the refusal; „Връзката прекъсна — активната таблица не е сменена. Опитайте отново." (page.tsx:70-73; tariff-history.tsx) | `ab-vers`, the kit's positive tag | Formal „Активирайте" |
| 13 | The server's and the parser's messages: „Поставете и двете таблици — транспортна и контейнерна.", „Не е намерен ред-заглавие с колона „Auction Location“. …", „Транспортната таблица съдържа само N валидни реда — …", the container and terminal checks, „Активната таблица не можа да бъде прочетена. …", the schema's messages, „Възникна грешка при запис. Моля опитайте отново.", „… в базата. …", „Тази версия не е записана изцяло и не може да бъде активирана.", „Версията не е намерена.", „Невалидна версия.", „Нямате достъп до тази операция." (mutations/tariffs/*; lib/tariff-parse.ts; schemas/calc-config.schema.ts) | `ab-messages` | — |
| 14 | Light cards | the night ground | The kit's |

**18.11.2026.** A pasted table with a single valid row reads „1 валиден ред" in its error (it read „1 валидни реда").
