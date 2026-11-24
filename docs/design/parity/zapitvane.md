# Безплатна консултация · /zapitvane (owner decision 40)

- Boards: `ac-zap` (d, t, p), `ac-zap-st` (fixed, 16 states), `ac-zap-flow` (phone flow, 9 frames), `ac-zap-tab`
  (tablet flow, 2 frames); `ad-inquiries-drawer` for the admin's „Източник" and „Кампания". The slice's notes:
  `D:/design/selectauto/notes/ac-zap.md`.
- A new page, so there is no old screen to keep; what it must keep is the quiz's behaviour (parity check `inquiry.md`,
  rows 1–18), and every string on it comes from the code: the boards' audit found all 128 at `5582bb3`, none new. The
  page's `<title>` and description are the only new text (not drawn: the browser tab and search results).
- Code: `app/zapitvane/page.tsx`, `components/inquiry/inquiry-page-quiz.tsx`, `components/inquiry/inquiry-quiz/*`,
  `styles/inquiry-page.css` (ported from `ac-zap.html`), `contexts/inquiry-context.tsx` (`registerInline`),
  `components/layout/public-widgets.tsx`, `lib/lead-source.ts`, `lib/admin-lead-view.ts`, `app/sitemap.ts`.
- Built and walked: 24.11.2026, on a local build with every non-GET request aborted and POST `/api/inquiry` answered
  by a mock, at 320, 360, 375, 390 (phone emulation), 820, 1024, 1440 and 1920, night and light. `check:layout` at
  320–390: no problems. axe's colour-contrast rule on every state of the card, both themes: no issues.

| # | What the page does | On the board | Outcome |
|---|---|---|---|
| 1 | The hero: „Безплатно", the h1 „Безплатна консултация", the dialog's line („SelectAuto е вашият надежден партньор …") and /kontakti's („Кажете ни какъв автомобил търсите …"), the phone and e-mail as tonal links | `ac-zap` | — |
| 2 | Desktop: text and links on the left, the card on the right, 560 px (536–560 between 1024 and 1279, up to 680 on wide screens). Below 1024 px the DOM's order, text, card, links; on a phone the card runs edge to edge | `ac-zap`, `-t`, `-p` | — |
| 3 | The card opens on „Стъпка 1 от 7" and „Търсите ли конкретен модел?": no start screen, logo picture or close. On a 360 and a 390 phone „Не" ends above the bottom tabs (716 px; tabs at 738 and 782) | `ac-zap-p`, flow 1 | — |
| 4 | Nothing takes the focus at load; from the first answer on, each new question does | flow 9 caption | — |
| 5 | On a phone, after the first answer the card comes up under the top bar (68 px from the top), so all 16 makes and every later step fit the screen; on desktop an answer never scrolls | flow 2–7; notes §5.1 | Settled while building (decision 40's notes) |
| 6 | The steps, the „Не" path („Стъпка 2 от 5"), the field messages, „Изпращаме заявката...", the server's errors in the red alert, and the request with the page's full address: the quiz's own (`inquiry.md`) | `ac-zap-st` 2–12 | — |
| 7 | „Назад" and forward keep the typed name and phone | — | — (`inquiry.md` row 16) |
| 8 | The thank-you stays (no closing, no step bar), with „Разгледайте автомобили" to the catalog | `ac-zap-st` 10, flow 7, tab 2 | — |
| 9 | The contact step's own chunk: a spinner if it hasn't arrived, the form-load message and „Опитайте отново" if it can't load | `ac-zap-st` 15–16 | — |
| 10 | The header's „Запитване", the phone menu's and the footer's „Направете запитване" scroll to the card and focus its question; no dialog opens on this page | `ac-zap-st` 14 | — |
| 11 | Phones: the bar „Направете запитване" shows once the card has scrolled away, and brings it back (68 px from the top) | flow 8–9 | — |
| 12 | „Защо SelectAuto" as on the home page (`WhyUsSection`), then „Процесът стъпка по стъпка" with the five steps of `data/process.ts`, numbered 1–5 as on the hubs, and the note linking to /proces (`ImportProcess`) | `ac-zap` | — |
| 13 | The reviews band (`HubTestimonials`): nothing until GOOGLE_PLACES_ID is set | `ac-zap-st` 13 | — |
| 14 | No Viber invite on this page: it appeared over the card's step bar and first answers as the card came up after the first answer. „Обратно нагоре" stays; the invite stays on every other page | none drawn | Settled while building (decision 40's notes) |
| 15 | Metadata: „Безплатна консултация \| SelectAuto", a description, the canonical without the ad tags, the share card; in the sitemap; static (prerendered) | — | New text for the owner |
| 16 | The admin's lead details (all three inboxes) show „Източник" (`utm_source · utm_medium`, else „Google Ads" for gclid/gbraid/wbraid, „Facebook" for fbclid) and „Кампания" (`utm_campaign`), above „Страница" | `ad-inquiries-drawer` | Decision 40 |

## Decision 41: the page replaces the dialog (24 November 2026)

Walked on a local build with POST /api/inquiry mocked: the header's „Запитване", /kontakti's „Започнете консултация",
the home hero's and the phone menu's „Направете запитване", the Korea hub's button, and a car's „Направете заявка".

| # | What the page does | On the board | Outcome |
|---|---|---|---|
| 17 | Every „Запитване", „Направете запитване" and „Направете заявка" is a link to /zapitvane; the browser's Back returns | `ac-zap-st` 14 | Owner decision 41 |
| 18 | A car's link carries the car in the address's fragment (`#make=…&model=…&car=…&lot=…&logo=…&from=…`), never in the query, so the page stays static and no crawler meets a variant | — | Owner decision 41 (lib/inquiry-link.ts, with tests) |
| 19 | From a car: „Стъпка 1 от 4", the banner with the make's plate, the car and „· Лот №", the budget first, „Назад" never before it, „Бюджет?" focused, and on a phone the card under the top bar | `ac-zap-st` 17–18, `ac-zap-flow2` 10–11, `cd-f-inquiry`, `cd-f-inquiry-d` | — |
| 20 | The inquiry from a car records the car's page (`/avtomobil/<id>`) as its page, as the dialog's did | — | Kept |
| 21 | A forged fragment can't put anything on the page: only the site's own logo files and car pages pass, malformed labels go missing (a make or model missing means no car) | — | — |
| 22 | A page opened straight from a car link shows the first question until its script runs, then the budget with the banner | — | Accepted (a shared link only; a link from the site switches before the first paint) |
