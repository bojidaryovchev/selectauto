# About · `/za-nas`

- Boards: `in-za-nas` (d, t, p). The design run's notes: `D:/design/selectauto/notes/in.md` §1, §2, follow-ups 1 and 3.
- Code on main, read in full: `app/za-nas/page.tsx`, `components/about/{about-hero,about-intro,about-stats,
  about-process,about-values,about-closing,social-link,canvas-video}.tsx`, `components/about/media.ts`,
  `data/process.ts`.
- Checked before building: 18.11.2026 · Walked after building: 18.11.2026, at 1440 and 390: the video painted over the
  new poster; the control switched „Спрете видеото" → „Пуснете видеото"; with reduced motion the page opened stopped on
  the poster; the four social links open in a new tab, WhatsApp to wa.me/359898980011.

## What the code does today

| # | What the code does today (file:line) | On the board | Outcome |
|---|---|---|---|
| 1 | Metadata „За нас — внос на автомобили от Корея, САЩ и Канада \| SelectAuto", description, share card; BreadcrumbList JSON-LD (page.tsx:15-37) | `info-meta` | — |
| 2 | Hero video: `about.mp4` painted on a canvas, muted and looping, paused while off screen; the poster `za-nas-poster.jpg` until it plays — an all-black first frame (canvas-video.tsx, media.ts) | the frame at 3 s as the poster, a control „Спрете видеото" at the top right | Fixed: the poster is now the video's frame at 3 s (REDESIGN.md, bugs). New, as drawn (WCAG 2.2.2): the control stops and restarts the loop („Спрете видеото" / „Пуснете видеото"); under reduced motion it starts stopped on the poster. The poster stays until the first frame is painted |
| 3 | H1 „Премиум подход към вноса на автомобили" (the last words in light orange), the lead, „Свържи се с нас" → /kontakti and „Разгледай автомобилите" → /vsichki-avtomobili (about-hero.tsx) | the display title with orange words, primary and secondary xl buttons | Formal „Свържете се с нас", „Разгледайте автомобилите" |
| 4 | Glass card „Какво получаваш с нас", its line and three points (about-hero.tsx:5-9, 61-79) | a glass panel, each point with an icon | Formal „Какво получавате с нас"; the points as written |
| 5 | „Кои сме ние": eyebrow, „Разумна покупка. Прозрачен процес. Сигурен резултат.", the subtitle, the paragraph with its bold first sentence and „…която търсиш … ти спестяваме…" (about-intro.tsx) | the heading beside the paragraph | Formal „…която търсите … ви спестяваме…" |
| 6 | Four figures: 3, 15+, 80+, 5+ with their labels and notes (about-stats.tsx) | four tiles, two per row below 1024 px | As drawn |
| 7 | „Как работим": „От заявка до ключ — в пет стъпки", „…да получиш автомобила…", the five steps from `PROCESS_STEPS`, „Разгледай целия процес" → /proces (about-process.tsx) | numbered cards, a secondary xl button with an arrow | Formal „…да получите…", „Разгледайте целия процес"; the steps as written |
| 8 | „Защо да ни се довериш": „Експертна преценка, прозрачност и пълен контрол", the subtitle, three values with icons, two of them informal (about-values.tsx) | three kit panels with icon tiles | Formal „Защо да ни се доверите", „…виждате … за вас.", „…да купувате…" |
| 9 | Closing: „Готов ли си да намерим правилния автомобил за теб?", „Свържи се с нас и ще изградим…", „Запитване" → the inquiry modal; „Следвайте ни", its line, Facebook, Instagram, TikTok and WhatsApp — WhatsApp links to `#` (about-closing.tsx) | the closing panel, the social links as 48 px icon buttons | Formal „Готови ли сте да намерим правилния автомобил за вас?", „Свържете се с нас…". Owner decision 18: WhatsApp → https://wa.me/359898980011. Every profile opens in a new tab, as before |
| 10 | Sections fade in on scroll (`Reveal`) | — | Kept |
| 11 | A light page ground | the night ground | The shell's (decision 4) |
