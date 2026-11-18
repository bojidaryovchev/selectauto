# Legal pages · `/obshti-usloviya`, `/politika-za-poveritelnost`, `/politika-za-biskvitki`

- Boards: `in-terms` (d, t, p), `in-privacy` (d, t, p), `in-cookies` (d, t, p), `in-legal-flow` (phone flow: the
  contents closed, open, after choosing §10, the §1 sentence without a company id). The design run's notes:
  `D:/design/selectauto/notes/in.md` §1, §2 and the `info-meta` findings.
- Code on main, read in full: `app/obshti-usloviya/page.tsx`, `app/politika-za-poveritelnost/page.tsx`,
  `app/politika-za-biskvitki/page.tsx`, `lib/social-meta.ts`.
- Checked before building: 18.11.2026 · Walked after building: 18.11.2026, at 1440, 1920, 1280×600, 820, 390, 320 and
  844×390, on all three pages: every heading and contents entry reads „N. Title" as before; the date line; the
  identity list with its labels bold; links orange, bold and underlined. Each of the 23 sections chosen from the
  contents was marked, its heading 52px under the header on a desktop and 22px under the bar below 1024px; reading
  down marked every section in order; a page opened at `#razdel-7` or `#razdel-10` marked that section. Escape
  closed the list and returned focus to its button. The bar rose to 8px when the top bar hid and came back with it.
  On 320×568, 844×390 and 1280×600 the list scrolled inside itself and kept the marked item in view. No sideways
  scroll. `og:url` is each page's own.

## What the code does today

| # | What the code does today (file:line) | On the board | Outcome |
|---|---|---|---|
| 1 | Metadata: „Общи условия \| SelectAuto", „Политика за поверителност \| SelectAuto", „Политика за бисквитки \| SelectAuto", their descriptions and canonicals (obshti-usloviya/page.tsx:7-12, politika-za-poveritelnost/page.tsx:6-11, politika-za-biskvitki/page.tsx:7-12) | `info-meta` | — |
| 2 | No share tags of their own, so `og:url` is the layout's: the home page (`info-meta` findings) | the finding | Fixed: each page builds its share tags with `buildSocialMeta` and its own path. Title and description as before |
| 3 | H1 in capitals through CSS, „Последна актуализация: юли 2026 г." under it („юни 2026 г." in the privacy policy) (obshti-usloviya:33-36, politika-za-poveritelnost:26-29, politika-za-biskvitki:37-40) | the head band, the date with a calendar icon | Sentence case (decision 10) |
| 4 | Numbered sections, each an H2 „N. Title": 10 in the terms, 8 in the privacy policy, 5 in the cookie policy. Paragraphs, lists, bold lead-ins (privacy §2), two H3s (cookies §2) | a 68ch column, each number in orange, the sections divided by hairlines | As drawn. The text is word for word (decision 25), its capitals included („Вашите", „Ви"); a heading reads as before, its number set apart |
| 5 | No contents | „Съдържание" beside the text on a desktop, sticky, the section being read marked; below 1024px a bar under the top bar that opens the list (`in-legal-flow` 1–3) | New, as drawn; „Съдържание" is approved (decision 12). Built further than a board can show: a jump puts the heading 22px under the bar (frame 3) or 52px under the header; choosing a section closes the list and marks it, even a short one or one at the foot; Escape closes the list; the bar follows the top bar when that hides; on a short screen the list scrolls inside itself and keeps the marked item in view |
| 6 | Terms §1 with a company id: Наименование, ЕИК, ДДС № (only with a VAT id), Седалище и адрес на управление, Адрес на дейност (шоурум), Контакт with the e-mail link. Without one: a sentence with the showroom's address, phone and e-mail (obshti-usloviya:45-73) | `in-terms`: the list as an identity card, the labels bold; `in-legal-flow` 4: the sentence | As drawn; both branches kept |
| 7 | Links: Контакти, the privacy and cookie policies, the e-mail, the EU's ODR platform in a new tab with `noopener noreferrer` (obshti-usloviya:59, 68, 133, 137, 151, 174-175; politika-za-poveritelnost:38, 119; politika-za-biskvitki:65, 88, 92) | orange, bold, underlined | As drawn; targets and attributes unchanged |
| 8 | A light page ground and an 860px column | the night ground | The shell's |

While the page scrolls down, the Viber popup (the shell's, `ac-float`) covers the contents bar along with the top of
the screen, until it is closed for the session or the page scrolls up. That is the popup's design, not this page's.
