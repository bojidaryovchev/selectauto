# E-mails · `apps/web/src/emails/*`, sent by `lib/email.ts`

- Boards (main canvas, page „Имейли и документи"): `ms-base`; `ms-em-verify`, `ms-em-reset`, `ms-em-calc`,
  `ms-em-digest`, `ms-em-calc-team`, `ms-em-carfax`, `ms-em-inquiry`, each as d (680), `-ph` (390) and `-txt` (the
  text/plain part); `ms-em-var-client`, `ms-em-var-team`, `ms-em-reply-txt`. The design run's notes:
  `D:/design/selectauto/notes/ms.md` (§1, §4 and follow-ups 1–3).
- Code on main, read in full: `emails/email-layout.tsx`, `info-row.tsx`, `theme.ts`, `index.ts` and the seven
  templates; `lib/email.ts` (senders, subjects, Reply-To, the text/plain parts);
  `mutations/calculator-offers/create-calculator-offer.mutation.ts`; `data/import-rates.ts` (the lines and their
  `muted` flag); `components/calculator/cost-estimator.tsx` (how the site shows those lines);
  `app/api/cron/favorite-auction-alerts/route.ts`; `mutations/mail/send-reply.mutation.ts`.
- Checked before building: 18.11.2026 · Walked after building: 18.11.2026. Nothing was sent (Resend is live).
  - Each e-mail was rendered with react-email's `render()`, the call Resend makes for the `react` prop. Main's
    templates went through the same react-email 6.9.0 for comparison.
  - Samples: Korea, SUV; Canada with a 70% customs base, which gives both muted lines; the digest with two real lots,
    and with one lot that has no photo and no price; Carfax with no e-mail and no message.
  - Screenshots at 700, 390 and 320: no sideways scroll, and every button stays on one line.
  - The HTML has no rem and no `var()`.
  - Text regression: every Cyrillic string of main's templates is in the new ones, except decision 19's. The rendered
    text matches main's except decisions 11 and 19.

| # | What the code does today (file:line) | On the board | Outcome |
|---|---|---|---|
| 1 | The shell: a dark band with the gold logo (176 px) and an orange underline; a white card, at most 600 px, on #f4f4f5; the footer with „SelectAuto", the phone and the e-mail as links, Facebook · Instagram · TikTok · Viber as links, a rule and „© 2026 SelectAuto. Всички права запазени." (email-layout.tsx:37-86) | `ms-base`: the night band with the logo (132 px) and no underline; the card on a pale desk; the same footer, socials in dark orange | — (the kit's look, decision 4) |
| 2 | `<Html lang="bg">`, but react-email's `Body` prints `lang="en"` on `<body>` and on its cell, so screen readers read the Bulgarian with an English voice (email-layout.tsx:37-41) | — | Fixed: `Body lang="bg"` |
| 3 | No phone rules: the 32 px paddings and the desk margin stay on a phone (email-layout.tsx:41-57) | `-ph` boards: the card meets the screen's edges, 20 px sides, a full-width button, labels above values | As drawn. The padded blocks are `Row`/`Column` cells: react-email moves a `Section`'s padding onto an inner cell, out of reach of its class, so a phone rule on a `Section` would never apply |
| 4 | Some sizes compile to rem (`max-w-150`, `w-33`, `py-2.75` give 37.5rem, 8.25rem and 0.6875rem), though the comment promises px for Outlook (email-layout.tsx:42; info-row.tsx:20, 25) | — | Fixed: every size is px. The e-mails lint against their own Tailwind (`emails/tailwind.css`), so the canonical-class fix can't turn px back into rem |
| 5 | No colour-scheme meta (email-layout.tsx:38) | `ms-base`, light only | As drawn: `color-scheme` and `supported-color-schemes` = light ask mail apps to keep the light body (notes §4 Q10) |
| 6 | The eyebrows „Калкулация за внос", „Ново запитване", „Нов лийд — калкулатор" in capitals through CSS (calculator-offer-email.tsx:16-18; carfax-notification-email.tsx:15-17; inquiry-notification-email.tsx:15-17; calculator-offer-notification-email.tsx:15-17) | `ms-eye`: the 18 × 2 orange bar, sentence case | Decision 10 |
| 7 | Verification: the preview „Потвърдете имейл адреса си за SelectAuto", „Добре дошли в SelectAuto", „Здравейте{ име},", the paragraph, the button „Потвърдете имейла", „Линкът е валиден 24 часа. …", „Ако бутонът не работи, копирайте този адрес в браузъра си:" and the address as a link, the signature (verification-email.tsx:13-48) | `ms-em-verify` | — |
| 8 | Password reset: the same parts, with „Смяна на парола", „Задайте нова парола" and „Линкът е валиден 1 час. …" (password-reset-email.tsx:13-46) | `ms-em-reset` | — |
| 9 | The buttons: white on #d86f16 (3.4:1), a pill (verification-email.tsx:26-31; password-reset-email.tsx:23-28; favorite-auction-digest-email.tsx:103-108) | `ms-cta`: dark text on #FF7A1A (7.5:1), the 10 px chamfer (Gmail and Outlook ignore clip-path and show a rectangle), full width on a phone | Fixed (contrast under 4.5:1); the look is the kit's primary (decision 4; notes §4 Q9). On a phone the sides are 12 px, so „Вижте любимите автомобили" stays on one line at 320 |
| 10 | The calculator e-mail: the preview „Вашата калкулация за внос от {пазар} — общо ≈ {сума}"; the eyebrow; „Внос от {пазар} — ориентировъчна разбивка"; „Здравейте, {име}! …"; each line's label and amount; „Общо (ориентир)" in capitals through CSS, the total in orange; „Ориентировъчен срок за доставка:" with the transit in bold; the rates sentence; a rule; the disclaimer with „Вас" and „НЕ"; the call line with the phone as a link (calculator-offer-email.tsx:15-73) | `ms-em-calc`: the lines, the total in a grey panel, the facts | As drawn: „Общо (ориентир)" in sentence case (decision 10), „Вас" and „НЕ" kept (decisions 11, 21), the transit kept on one line |
| 11 | „Ставките (мито, ДДС, екотакса) са проверени към {дата}." (calculator-offer-email.tsx:56) | „Ставките (мито, ДДС) са проверени към …" | Owner decision 19 |
| 12 | Lines outside the total („Междинна сума (до Холандия)", „Митническа основа (N%)") look like cost lines in the e-mail, while the site's calculator greys them: the e-mail data has no `muted` (lib/email.ts:146; data/import-rates.ts:213, 279, 321, 340; components/calculator/cost-estimator.tsx:71-75) | `ms-em-var-client`: grey label and amount, weight 500, a dashed rule | Fixed: the mutation passes `muted` and the customer e-mail greys those lines as the site does (notes §4 Q7). The team e-mail draws every line alike, as its board does, like the admin drawer |
| 13 | „(2.5%)" in the Korea line's label (data/import-rates.ts:266) | „(2,5%)" | Decision 11, built in `data/import-rates.ts` earlier on this branch |
| 14 | The team calculator notification: the preview, the eyebrow, „Заявена калкулация ({пазар})", the rows Име, Телефон (tel:), Имейл (mailto:), Пазар, each line, Общо, Страница (a link), Дата (calculator-offer-notification-email.tsx:14-32) | `ms-em-calc-team`: the lines with the amount on the right in tabular figures, „Общо" heavier | As drawn |
| 15 | A row: the label in capitals through CSS, the value, an em dash when empty, links in orange (info-row.tsx:15-35) | `ms-row`: sentence case, a 132 px label column, the label above its value on a phone | Decision 10 |
| 16 | The Carfax notification: the preview, the eyebrow, „Carfax проверка по VIN", the box „VIN номер" (capitals through CSS) with the VIN, the rows Име, Телефон, Имейл, Марка, Модел, Съобщение, Страница, Дата (carfax-notification-email.tsx:14-44) | `ms-em-carfax`: the VIN in mono | Decision 10 for „VIN номер" |
| 17 | The inquiry notification: the preview, the eyebrow, „Безплатна консултация", the rows Име, Телефон, Конкретен модел, Марка, Модел, Бюджет, Срок, Финансиране, Страница, Дата (inquiry-notification-email.tsx:14-33) | `ms-em-inquiry` | — |
| 18 | The digest: „1 от любимите ви е на търг днес" or „{N} от любимите ви са на търг днес" (also the preview); the greeting; per car the photo (536 px, a link, alt = the title), the title as an orange link, „Търг: … · Цена: … · Търг № … · {източник}", a rule between cars; „Вижте любимите автомобили" to /lyubimi; the note on turning the alerts off (favorite-auction-digest-email.tsx:58-114) | `ms-em-digest`: each car a bordered card, the photo across the top (518 px), the title in ink | As drawn. „№" stays with its number (a no-break space) |
| 19 | Subjects, From, Reply-To, To and every text/plain part (lib/email.ts:65-348) | `ms-em-*-txt` | — (unchanged) |
| 20 | Staff replies from /admin/poshta are plain text, with no template (mutations/mail/send-reply.mutation.ts:136) | `ms-em-reply-txt` | — (unchanged) |

The PDFs (contracts, deposit contract, payment notices) are not part of this check: they keep today's look until the
owner answers the open questions on their typeface, colour and page breaks (REDESIGN.md).
