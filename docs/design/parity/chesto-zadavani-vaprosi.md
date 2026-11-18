# FAQ · `/chesto-zadavani-vaprosi`

- Boards: `in-faq` (d, t, p), `in-faq-flow` (phone flow: all closed, one open, two open), `in-faq-all` (fixed: every
  answer). The design run's notes: `D:/design/selectauto/notes/in.md` §1, §2 and follow-up 3.
- Code on main, read in full: `app/chesto-zadavani-vaprosi/page.tsx`, `lib/site-jsonld.ts` (`buildFaqJsonLd`,
  `buildBreadcrumbJsonLd`).
- Checked before building: 18.11.2026 · Walked after building: 18.11.2026, at 1440 and 390: nine questions as H2s, the
  first open, a second opened beside it, the eight closed answers in the page; the FAQPage JSON-LD (9) carries the Korea
  sentence; the chips' flags 21 × 14; the CTA opens the inquiry modal.

## What the code does today

| # | What the code does today (file:line) | On the board | Outcome |
|---|---|---|---|
| 1 | Metadata „Често задавани въпроси за внос на автомобил \| SelectAuto", the description and share card (page.tsx:27-37) | `info-meta` | — |
| 2 | JSON-LD: BreadcrumbList Начало → Често задавани въпроси, FAQPage from the same 9 answers (page.tsx:98-111) | — | Kept; the FAQPage follows the answers, decision 23 included |
| 3 | A visible breadcrumb (page.tsx:113-119) | the kit's „Пътечка" | As drawn |
| 4 | H1 „Често задавани въпроси" (capitals through CSS); the intro „…Ако не намираш отговор, свържи се с нас." (page.tsx:121-127) | the head band with the glow | Sentence case (decision 10); formal „Ако не намирате отговор, свържете се с нас." |
| 5 | Nine questions, each an H2 with its answer, all shown (page.tsx:40-86, 130-139) | the kit accordion in a panel, the first answer open; any number open (`in-faq-flow`) | As drawn. Each question stays an H2 around its button, and a closed answer stays in the page (hidden), so the FAQPage JSON-LD still matches |
| 6 | „Колко време отнема вносът на автомобил?": two sentences (page.tsx:47-50) | `in-faq-all`: a third sentence on Korea | Owner decision 23: „При внос от Корея срокът е по-дълъг: реалистично 2–3 месеца от покупката до готовност за регистрация в КАТ." |
| 7 | „Полезни страници": six pill links (page.tsx:89-96, 142-156) | chips with icons and flags in a panel beside the answers | As drawn; the same six links |
| 8 | CTA „Имаш друг въпрос?", „Кажи ни какво те интересува — …", „Направи запитване" (capitals through CSS) → the inquiry modal (page.tsx:159-170) | a panel under the links with an icon, the primary xl button; the column stays in view while the answers scroll on a desktop | Formal „Имате друг въпрос?", „Кажете ни какво ви интересува — …", „Направете запитване" |
| 9 | A light page ground | the night ground | The shell's (decision 4) |
