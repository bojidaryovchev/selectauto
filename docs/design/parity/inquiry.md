# Inquiry dialog · „Безплатна консултация" (`components/inquiry`), opened from every „Запитване"

- Boards: `ac-inq-desk` (fixed 1440: the start over a page, then every step as a dialog), `ac-inq-quiz` (phone flow:
  full screen), `ac-inq-desk2` (fixed 1440: from a car, the „Не" path, field errors, sending, sent, send errors),
  `ac-inq-send` (phone flow), `ac-inq-tab` (tablet flow). The design run's notes: `D:/design/selectauto/notes/ac.md`
  §1–4.
- Code on main, read in full: `components/inquiry/inquiry-modal/*`, `components/inquiry/inquiry-button.tsx`,
  `contexts/inquiry-context.tsx`, `schemas/inquiry.schema.ts`, `data/inquiry-brands.ts`, `types/inquiry.type.ts`,
  `app/api/inquiry/route.ts`, `mutations/inquiries/create-inquiry.mutation.ts`, and `carInquiryPrefill` in
  `components/cars/car-detail/car-contact-panel.tsx`.
- Checked before building: 18.11.2026 · Walked after building: 18.11.2026 at 1440 and 390 (full screen), POST
  `/api/inquiry` answered by a mock, so nothing stored or sent. Walked: the start, then every step with „Стъпка N от
  7" and its segments, the 16 makes with their plates (3 columns, 2 on a phone), focus moving to each new question;
  the field messages; „Изпращаме заявката..."; the thank-you without back or progress, closing after 2,2 s with the
  focus back on „Запитване"; the payload as before; the „Не" path („Стъпка 2 от 5", back to the first question);
  Escape and the scrim; „Достъпът е отказан.", the server's error and no connection in the red alert; from a car,
  the banner with the plate and the lot, the budget as step 1 of 4 and „Назад" stopping there.

## What the code does today

| # | What the code does today (file:line) | On the board | Outcome |
|---|---|---|---|
| 1 | One dialog for the site, its code loaded after the first paint; opened before it arrives, a dimmed page with a spinner; a load failure closes it with „Формата не успя да се зареди. Моля опитайте отново." (inquiry-context.tsx) | `ac-float` 5–6 (shell) | Kept, as built with the shell |
| 2 | A light card 520 px wide, full screen from 640 px down; a blurred backdrop that closes it; Escape closes it; the page doesn't scroll behind it; focus stays where it was (inquiry-modal.tsx:119-131, 243-263) | a 560 px dark dialog near the top, on the scrim; full screen on a phone (`ac-inq-quiz`) | As drawn (notes ac §4 Q8: 560 px). Focus now moves into the dialog, to each new question, and back to the opener on close |
| 3 | The dialog is named by the start screen's heading only; later steps have no name (inquiry-modal.tsx:247, 341-346) | `aria-label="Безплатна консултация"` on every step | As drawn |
| 4 | Header: „Назад" (an arrow, from the second reachable step), „Затвори" (inquiry-modal.tsx:266-285) | the kit's icon buttons | Formal „Затворете" (decision 1) |
| 5 | „Стъпка N от M" over a bar: 7 steps, 5 on the „Не" path, 4 from a car; hidden on the start and on success (inquiry-modal.tsx:225-240, 287-300) | „Стъпка N от M" over the kit's segmented steps | As drawn |
| 6 | Start: the logo picture, „Безплатна консултация", „SelectAuto е вашият надежден партньор …", „Започни консултация" (inquiry-modal.tsx:321-355) | the picture, the title in the display face, a primary button | Formal „Започнете консултация" |
| 7 | Steps: „Търсите ли конкретен модел?" Да / Не; „Изберете марка" (16 makes); „Изберете модел"; „Бюджет?"; „До колко време искате да закупите автомобил?"; „Как ще финансирате автомобила?"; each answer moves on, „Не" skips make and model (inquiry-modal.tsx:142-169, 357-423; data/inquiry-brands.ts) | answers as 56 px rows with a chevron; the makes as a grid with their logo plates (3 columns, 2 on a phone); the models as a grid | As drawn; the answers and their order unchanged. The logos are the site's own (`public/brand-logos`) |
| 8 | From a car (`prefill` with make and model): make and model pre-answered, the budget first, „Назад" never before it, a banner „Запитване за" + the car + „· Лот № …" (inquiry-modal.tsx:85-113, 171-189, 302-315) | the banner with the make's plate, the lot in mono (`ac-inq-desk2` 1–2) | As drawn; the make's logo travels with the prefill |
| 9 | Contact: „Вашето име" (Име), „Телефон" (+359XXXXXXXXX), messages „Моля въведете име." / „Моля въведете валиден телефонен номер."; the phone normalised to +359… (inquiry-modal.tsx:425-476; inquiry.schema.ts) | the kit's fields, the message under each with an icon | As drawn |
| 10 | „Изпрати" / „Изпращаме заявката..." while sending; POST `/api/inquiry` with the answers and the page's address (inquiry-modal.tsx:194-223, 478-480) | the primary xl button, a spinner while sending | Formal „Изпратете"; the request unchanged |
| 11 | Send errors under the button in red text: the server's („Възникна грешка при изпращането. Моля опитайте отново.", „Достъпът е отказан.", „Невалидна заявка.", the schema's) and, without a connection, „Грешка при изпращане. Моля опитай отново." (inquiry-modal.tsx:217-221, 482-486; route.ts; create-inquiry.mutation.ts) | a red alert under the button (`ac-inq-desk2` 7–8) | As drawn; formal „Моля опитайте отново." in the client's own message |
| 12 | Sent: a check, „Благодарим!", „Вашата заявка е приета. Ще се свържем с вас скоро."; it closes after 2,2 s (inquiry-modal.tsx:214-216, 491-503) | `ac-iqok`: the green circle, the title in the display face; no back or progress | As drawn |
| 13 | Each open starts afresh: the start screen, or the budget from a car; the fields cleared (inquiry-modal.tsx:93-113, 133-138) | — | Kept |

## 24 November 2026: one quiz for the dialog and the /zapitvane page (owner decision 40)

The steps moved out of the dialog into `components/inquiry/inquiry-quiz/` (`inquiry-quiz.tsx`, `quiz-step.tsx`,
`quiz-option.tsx`, `contact-step.tsx`), which the new page shows too (parity check `zapitvane.md`).
`inquiry-modal.tsx` is now the frame: the scrim, Escape, the scroll lock and the focus going in and back. Re-walked
on the built dialog the same day. Rows 1–13 hold as before: the same steps, strings, request and focus.

| # | What changed (file:line before) | On the board | Outcome |
|---|---|---|---|
| 14 | The quiz's state, steps and submit lived in the dialog (inquiry-modal.tsx:69-244) | `ac-inq-*` | Kept, moved: `InquiryQuiz` in its `dialog` variant draws the same start, steps, banner and thank-you. Each open mounts it afresh, which is the reset of row 13 |
| 15 | The thank-you closed the dialog with a bare `setTimeout(close, 2200)` (inquiry-modal.tsx:237), so a dialog reopened within those 2,2 s closed by itself | `ac-inq-send` 4 | Fixed: the timer is cleared when the dialog closes |
| 16 | The name and phone kept their typed values across „Назад" and forward (react-hook-form keeps an unmounted field's value) | — | Kept: the contact step hands its values back when it closes and gets them again when it opens |
| 17 | react-hook-form and zod came with the dialog's chunk | — | The contact step is a chunk of its own, warmed after the first paint with the dialog's. Reached before it arrives: a spinner; if it can't load: „Формата не успя да се зареди. Моля, опитайте отново." with „Опитайте отново" (both existing strings; boards `ac-zap-st` 15–16) |
| 18 | Every „Запитване" opened the dialog | `ac-zap-st` 14 | Owner decision 40: on /zapitvane a plain „Запитване" (no car) brings the page's own quiz into view instead |

## 24 November 2026, later: the dialog is removed (owner decision 41)

Every „Запитване" is a link to /zapitvane now (`InquiryButton`, the header, the phone menu, the home hero), and the
dialog, its provider, its start screen and its picture are gone. What the dialog did lives on on the page (parity
check `zapitvane.md`, rows 17–22): a car's „Направете заявка" carries the car, and the page opens at the budget with
the banner, „Назад" stopping there, the question focused, and the car's page recorded as the inquiry's page. Re-walked
the same day on a local build.

| # | What the dialog did | Where it is now | Outcome |
|---|---|---|---|
| 19 | The start screen (the picture, „Безплатна консултация", the line, „Започнете консултация") | The page's hero says the same | Owner decision 41 |
| 20 | Escape, the scrim, the scroll lock, the focus going back to the opener, closing itself 2,2 s after the thank-you | Gone with the dialog; the browser's Back returns to the page the visitor came from | Owner decision 41 |
| 21 | A tap before the dialog's code had loaded showed a dimmed page with a spinner; a load failure, the toast „Формата не успя да се зареди. Моля, опитайте отново." | A link always works; the form step's own load failure is on the page (`ac-zap-st` 16) | Boards `ac-float` 5–6 and `ac-float-desk` 5 retired |
