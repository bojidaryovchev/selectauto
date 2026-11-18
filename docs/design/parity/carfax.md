# Carfax · `/carfax`, the Carfax form and the Carfax dialog

- Boards: `in-carfax` (d, t, p), `in-carfax-flow` (phone flow: filling, missing fields, wrong VIN, sending, sent, save
  error), `in-carfax-msgs` (fixed: every message), `in-vin-dlg` (fixed: the dialog from the VIN tool and from a car),
  `in-vin-carfax` (phone flow: the dialog full screen, sent). The design run's notes: `D:/design/selectauto/notes/in.md`
  §1, §2, follow-up 3.
- Code on main, read in full: `app/carfax/page.tsx`, `components/carfax/{carfax-hero,carfax-benefits,
  carfax-form-section}.tsx`, `components/carfax/carfax-form/{carfax-form,form-field}.tsx`,
  `components/carfax/carfax-dialog/{carfax-dialog,carfax-inquiry-button}.tsx`, `schemas/carfax.schema.ts`,
  `app/api/carfax-request/route.ts`, `mutations/carfax/create-carfax-request.mutation.ts` (its messages), `lib/phone.ts`.
- Checked before building: 18.11.2026 · Walked after building: 18.11.2026, at 1440, 820 and 390, every POST mocked:
  an empty submit showed the three errors and focused „Име и фамилия"; „abc" the VIN error; sending showed the spinner
  with the button locked; a success the green alert and cleared the fields (payload: phone +359888123456, VIN
  upper-cased, the page URL); a failure the red alert with the data kept. The dialog on an IAAI car (154485275): the
  car and lot under the title, VIN, make and model locked; focus to „Затворете", back to the trigger on close. The
  phone bar showed over the benefits and the footer and hid over the form and the hero's actions; on an 820 × 1180
  tablet one of them is always on screen, so it stays hidden.

## What the code does today

| # | What the code does today (file:line) | On the board | Outcome |
|---|---|---|---|
| 1 | Metadata „Carfax проверка в България — поръчай доклад \| SelectAuto", „Поръчай Carfax проверка…", share text „…преди да вземеш решение."; BreadcrumbList JSON-LD (page.tsx:12-35) | `info-meta` | Formal „поръчайте доклад", „Поръчайте…", „…да вземете решение." |
| 2 | Hero on a stock photo: H1 „Поръчай Carfax проверка за избрания автомобил" (the brand words light orange), „Получи … да вземеш решение.", „Изпрати запитване" → the form, „Свържи се с нас" → /kontakti; the card „Какво можеш да провериш", „…Провери важните детайли…" and three points (carfax-hero.tsx) | the head band on the night ground, the display title, primary and secondary xl buttons, the card with an icon per point | Formal throughout; no stock photo, as on /kontakti (REDESIGN.md call 7) |
| 3 | „Защо Carfax": „По-малко риск. По-добро решение.", „Проверка, която ти дава…", three cards in three colours (carfax-benefits.tsx) | three kit panels with icons, one surface | Formal „…ви дава…", „Вижте…", „Намалявате … взимате…", „Изпратете … с вас…"; „По-добро" kept on one line |
| 4 | Form block `#sa-carfax-form-block`: „Изпрати запитване за Carfax", „Остави ни … с теб…", three points, the third „Запитването се записва и в нашия админ панел" (carfax-form-section.tsx) | the info column (sticky on a desktop) beside the form card | Formal; owner decision 19: the third point is gone. The anchor id is kept |
| 5 | Form: Име и фамилия, Телефон (required), Имейл, VIN номер (required), Марка, Модел, Допълнителна информация with their placeholders; pairs side by side, stacked in the dialog (carfax-form.tsx) | kit fields, required ones marked „*", pairs in rows | As drawn; the labels and placeholders as written |
| 6 | Validation: „Въведи име и фамилия.", „Въведи телефон за връзка.", „Въведи VIN номер.", „Невалиден VIN номер — провери за печатна грешка." under the fields; focus to the first; re-validated while typing (carfax.schema.ts, carfax-form.tsx) | `in-carfax-flow` 2–3: each error with an icon | Formal „Въведете…", „…проверете…". The same schema guards the API, so its messages change with it |
| 7 | Submit: POST `/api/carfax-request` with the phone normalised, the VIN upper-cased and the page URL; the button disabled while sending; the result in one box: success (the server's message, or „Успешно изпратено."; the contact fields clear), or an error (the server's message, „Възникна грешка.", or „Възникна грешка при изпращането. Моля опитайте отново."); the data stays (carfax-form.tsx:89-135) | `in-carfax-flow` 4–6, `in-carfax-msgs`: a spinner while sending, a green or red alert | As drawn; every message word for word (the missing comma after „Моля" is left for the app-wide fix, REDESIGN.md bugs). Request, record and e-mails unchanged |
| 8 | Dialog (the car page's contact panel, the VIN tool): „Заяви Carfax проверка", the car and „ · Лот № …" or „Остави данни за контакт и ще се свържем с теб."; „Затвори"; VIN, make and model locked („(от обявата)", „Заключено — …"); Escape, a press outside, body scroll locked, focus to the close button; closes 2,5 s after a success; full screen on a phone (carfax-dialog.tsx) | `in-vin-dlg`, `in-vin-carfax`: the kit dialog, locked fields dashed with a lock | Formal „Заявете…", „Оставете … с вас.", „Затворете". Focus returns to the button that opened it |
| 9 | — | on phones and tablets a bar „Изпратете запитване" to the form | New, as drawn (design-run question 7): it hides while the hero's actions or the form are on screen, follows the tabs and lifts back-to-top |
| 10 | Sections fade in on scroll (`Reveal`); a light page ground | the night ground | Kept; the shell's ground |

**18.11.2026, production review.** Name, phone and VIN carry `aria-required` again: main marked them `required`,
which, with the form `noValidate`, told only screen readers.
