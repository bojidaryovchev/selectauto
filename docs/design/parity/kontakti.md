# Contacts · `/kontakti`

- Boards: `in-kontakti` (d, t, p), `in-kontakti-flow` (phone flow: number copied, copy refused, hours „Проверка…",
  closed, map loaded), `in-kontakti-spec` (fixed: every hours state, the copy button, the links, the toasts). The design
  run's notes: `D:/design/selectauto/notes/in.md` §1, §2.
- Code on main, read in full: `app/kontakti/page.tsx`, `components/contacts/{contact-hero,contact-map,map-embed,
  contact-cta}.tsx`, `components/contacts/contact-cards/{contact-cards,copy-button,hours-status}.tsx`,
  `constants/index.ts` (BUSINESS, CONTACT), `lib/site-jsonld.ts` (`buildLocalBusinessJsonLd`).
- Checked before building: 18.11.2026 · Walked after building: 18.11.2026, at 1440 and 390: „Копирайте" copied the
  number to the clipboard, turned to „Копирано" with a tick and showed „Копирано: +359898980011"; the hours line read
  „Затворено · Отваря днес в 09:00" at 04:30; „Заредете картата" mounted the iframe (its Google request blocked in the
  test); the e-mail link carries its subject. On a phone the copy buttons are icons.

## What the code does today

| # | What the code does today (file:line) | On the board | Outcome |
|---|---|---|---|
| 1 | Metadata „Контакти — SelectAuto", the description, share card (page.tsx:13-24) | `info-meta` | — |
| 2 | JSON-LD: LocalBusiness/AutoDealer with address, geo and hours, and the BreadcrumbList (page.tsx:30-47) | — | Kept |
| 3 | Hero on a stock photo with a dark tint: H1 „Контакти" and „Свържете се с нас бързо и лесно – ние сме тук, за да ви съдействаме!", fading in (contact-hero.tsx) | the head band on the night ground with the hero glow, no photo | As drawn (no stock images; design-run question 4); the text as written. Without the photo the page loads one image fewer |
| 4 | Phone card: „Телефон за връзка", „Натисни за обаждане или копирай номера", both numbers as `tel:` links each with a copy button, the pills „Бърза връзка" and „Отговор в работно време" (contact-cards.tsx:51-88) | a kit panel, the numbers in rows, tags with icons | Formal „Натиснете за обаждане или копирайте номера" |
| 5 | Copy buttons: „Копирай" / „Копирано" with an icon (the text hidden below 480 px), name and title „Копирай {номер, адрес, имейл}", notification „Копирано: {стойност}" or „Копирането не бе успешно", the tick for 1,4 s (copy-button.tsx) | `in-kontakti-spec`: a secondary md button, icon-only below 640 px, a green tick state | Formal „Копирайте", „Копирайте {…}"; the notifications word for word |
| 6 | Address card: „Адрес", „гр. Пловдив, ул. Север 64", the parking line, „Навигация" → Google Maps directions in a new tab, copy (contact-cards.tsx:91-117) | a kit panel, „Навигация" as a secondary button with an arrow | As drawn |
| 7 | Hours card: „Работно време", „Винаги добре дошли", three rows, and the live line: „Проверка…" until mounted, then „Отворено сега · Затваря в …" or „Затворено · Отваря днес/утре/в {ден} в …", refreshed every 30 s (contact-cards.tsx:120-142, hours-status.tsx) | the hours list with orange times, the status on a green, red or neutral ground with a dot (`in-kontakti-spec`) | As drawn; the schedule and every message as written. The line is a live region now (`role="status"`) |
| 8 | E-mail card: „Имейл", „Пишете ни – отговаряме възможно най-бързо", the address as `mailto:` with copy, „Изпрати имейл" → `mailto:` with the subject „Запитване от selectauto.bg" (contact-cards.tsx:145-174) | a kit panel | Formal „Изпратете имейл" |
| 9 | Map: eyebrow „Локация", „Вижте ни на картата", „Лесно паркиране · Бърз достъп"; no iframe until „Зареди картата" (the click is the consent), the address and the cookie note with its link; then the Google iframe titled „SelectAuto — гр. Пловдив, ул. Север 64" (contact-map.tsx, map-embed.tsx) | the consent panel with a pin; `in-kontakti-flow` frame 5 for the loaded map | Formal „Заредете картата"; the consent flow unchanged; the iframe fills the panel's box |
| 10 | CTA: „Безплатно", „Безплатна консултация", „Кажи ни какъв автомобил търсиш, а ние ще ти помогнем да стигнеш … Започни … с теб.", „Започни консултация" → the inquiry modal, and the phone and e-mail links (contact-cta.tsx) | a kit panel, the orange tag, the primary xl button, tonal buttons for the phone and e-mail | Formal „Кажете ни какъв автомобил търсите, а ние ще ви помогнем да стигнете … Започнете … с вас.", „Започнете консултация" |
| 11 | Sections fade in on scroll (`Reveal`) | — | Kept |
| 12 | A light page ground | the night ground | The shell's (decision 4) |
