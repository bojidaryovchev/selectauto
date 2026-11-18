# Blog · `/blog`, `/blog/[slug]` and the 12 posts

- Boards: `in-blog` (d, t, p), `in-blog-empty` (phone: no posts), `in-blog-post` (d, t, p: „Корея или Америка"),
  `in-blog-elements` (fixed: the markdown elements other posts use, the meta-line variants). The design run's notes:
  `D:/design/selectauto/notes/in.md` §1, §2, follow-up 2.
- Code on main, read in full: `app/blog/page.tsx`, `app/blog/[slug]/page.tsx`, `lib/blog.ts`, the 12 files in
  `content/blog/`.
- Checked before building: 18.11.2026 · Walked after building: 18.11.2026, at 1440 and 390: 12 cards, each „Прочетете"
  named after its post; „Корея или Америка": the formal title in the page and its `<title>`, the date line, two tables
  with all 33 body cells labelled, the „Общо (ориентир)" row marked, the rows as cards on a phone, the aside sticky on
  a desktop and under the article on a phone, links orange and underlined. No sideways scroll.

## What the code does today

| # | What the code does today (file:line) | On the board | Outcome |
|---|---|---|---|
| 1 | Index metadata, BreadcrumbList and ItemList JSON-LD (blog/page.tsx:19-41) | `info-meta` | — |
| 2 | A visible breadcrumb; H1 „Блог" (capitals through CSS); the intro (blog/page.tsx:52-64) | the head band | Sentence case (decision 10) |
| 3 | The published posts newest first: the date, the title linking to the post, the description, „Прочети →" (blog/page.tsx:66-87) | cards in a grid, the date with a calendar icon, „Прочетете" with an arrow icon | Formal, the arrow an icon. Each „Прочетете" is named after its post („Прочетете: …"), so twelve links no longer share one name |
| 4 | No posts: „Още няма публикувани статии — очаквайте скоро." (blog/page.tsx:66-67) | `in-blog-empty`: a dashed panel | As drawn |
| 5 | Drafts (`draft: true`) hidden from the index, the routes and the sitemap; a draft or unknown slug 404s (lib/blog.ts) | — | Kept |
| 6 | Post metadata from the post's title and description, Article and BreadcrumbList JSON-LD ([slug]/page.tsx:31-53, 60-73) | `info-meta` | Kept; the titles follow decision 20 |
| 7 | Breadcrumb Начало / Блог / title; the line „дата · обновена … · автор" (capitals through CSS); H1 ([slug]/page.tsx:80-101) | the head band, the date line with a calendar icon | Sentence case; the line as written |
| 8 | Markdown through react-markdown + remark-gfm: H2, H3, paragraphs, lists, links, bold, quotes, tables, rules, each styled in the page ([slug]/page.tsx:103-145) | the kit's prose; quote, rule and italic from `in-blog-elements`; tables that become labelled cards on a phone, „Общо" rows highlighted | As drawn: a small rehype step labels each cell with its column, marks figures and all-bold rows (lib/rehype-table-cards.ts) |
| 9 | CTA after the article: „Искаш точна сметка за конкретен автомобил?", „Използвай … кажи ни…", „Калкулатор за внос" → /kalkulator and „Направи запитване" (capitals through CSS) → the inquiry modal ([slug]/page.tsx:147-170) | an aside beside the article, sticky on a desktop, under it below 1024 px | Formal „Искате…", „Използвайте … кажете ни…", „Направете запитване" |
| 10 | The 12 posts speak to the reader as „ти" (`content/blog/*.md`) | the drawn post and every title and description in „вие" | Owner decision 20: every post in formal „вие", lowercase as the decision says; 61 lines in 12 files, word for word otherwise. Four titles change (their `<title>` and share text too); the URLs don't, they come from the file names |
| 11 | A light page ground | the night ground | The shell's |

**18.11.2026.** „Корея или Америка" and the Japan post give the sea leg from Korea as ≈5–7 weeks and ≈8–10 weeks to
Bulgaria, without the Cape of Good Hope (point 6, decision 34); the post's description says „морски превоз 5–7 срещу
4–7 седмици".
