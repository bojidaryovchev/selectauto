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

**18.11.2026, production review.** The 12 posts carry `updated: "2026-11-18"`: their text changed today (decision 20, and
point 6 for two of them). The date shows as „обновена 18.11.2026" and goes to `dateModified`, the Open Graph
`modifiedTime` and the sitemap's `lastModified`.

## 24.11.2026, decision 43: wider cards and a photo for every post

The owner: on a big screen the index was six narrow columns (300 px at 2560, titles of 3–6 short lines), and every
post should have a photo. Measured on production before the change: 6 columns × 300 px at 2560, 5 × 327 at 1920,
4 × 307 at 1440, titles wrapping 3–6 lines and descriptions 9.

| # | What changed | Where | Kept |
|---|---|---|---|
| 1 | The grid: one column below 1024 px, the photo beside the text once the card is 690 px wide (stacked like a phone below that); from 1024 px columns of at least 400 px, at most three | `styles/info-blog.css` | The order (newest first), the `ItemList` and `BreadcrumbList` JSON-LD, the empty state |
| 2 | Each card leads with its post's photo (16:9), a mouse-only second link to the post (`tabIndex={-1}`, `aria-hidden`); pointing at a card lights its title and eases the photo in (not under reduced motion) | `app/blog/page.tsx` | Date, title link, description, „Прочетете" named „Прочетете: {title}": keyboard and screen readers get the same two links as before |
| 3 | The photos' credits on their own page, „Снимки и лицензи" (`/snimki-i-litsenzi`, decision 44), linked from every page's footer: per photo its post, its own title linked to Wikimedia Commons, author, license and „Изрязана от оригинала". No caption under the photos | `app/snimki-i-litsenzi/page.tsx`, `styles/info-credits.css`, `data/navigation.ts` | The footer's three legal links |
| 4 | The post shows its cover under the title (21:9 on a desktop, 16:9 below 1024 px) | `app/blog/[slug]/page.tsx`, `styles/info-blog-post.css` | Breadcrumb, date line, H1, the article and its aside |
| 5 | The cover is the post's og:image and twitter:image (1920×1080, its alt), the Article's `image` (an `ImageObject` with credit, license and the Commons page), the sitemap's `<image:loc>`, with `max-image-preview:large`. The <img src> is the same file (`overrideSrc`); browsers still take the optimized srcset | `lib/social-meta.ts`, `lib/site-jsonld.ts`, `app/sitemap.ts` | Title, description, canonical, dates |
| 6 | The covers: 12 photos from Wikimedia Commons (5 CC0 or public domain, 7 CC BY-SA), cut to 1920×1080 by `scripts/blog-cover.mjs`, the credit written into each file (XMP); the fields in the frontmatter (`lib/blog.ts`), checked by `tests/blog-covers.test.mts` | `content/blog/*.md`, `public/images/blog/` | — |
| 7 | Decision 20, missed: „Ако си гледал корейски коли онлайн, си попадал" → „Ако сте гледали …, сте попадали" (Encar post); `tests/formal-register.test.mts` now flags „си" + a past participle | `content/blog/encar-na-balgarski-kak-se-chete-dokladat.md` | The rest of the post; `updated` stays (a one-line correction) |

Boards `in-blog` and `in-blog-post` don't show this yet; they're to be redrawn from the code (REDESIGN.md, „Before the
canvases can be published again", 9).

**Walked after building, 24.11.2026** (a local production build, read-only, both themes):

| Width | Columns × card | Titles | Descriptions |
|---|---|---|---|
| 2560 | 3 × 624 px | 2–3 lines | 3–4 |
| 1920 | 3 × 561 | 2–3 | 3–5 |
| 1440 | 3 × 416 | 2–3 | 4–6 |
| 1366 | 2 × 603 | 1–3 | 3–4 |
| 1280 | 2 × 565 | 2–3 | 3–4 |
| 1024 | 2 × 450 | 2–3 | 4–5 |
| 820–1000 | 1, photo beside the text | 2–3 | 3–4 |
| 600–768 | 1, stacked, photo 16:9 | 1–3 | 2–4 |
| 390 | 1, stacked | 2–4 | 4–6 |

All 12 photos load at a fitting size (640 px files for 624 px cards at 2560; nothing upscaled). The post's cover at
1440 is 1200 × 514 under the title, and the Japan post's taxi stays in its 21:9 crop through `focus: "50% 85%"`.
Keyboard: 24 stops on the index (title and „Прочетете" per card), as before. axe, every rule, both themes, index and post at
1440 and 390: no violation. `check:layout` at 320, 360, 375 and 390 on /blog and two posts: no problems. No sideways
scroll at any width, no console errors. The sitemap lists the 12 covers; og:image, twitter:image and the Article's
`ImageObject` give the same file.

**Decision 44, walked the same day:** the posts and the index have no caption or credits line; every page's footer
links „Снимки и лицензи". /snimki-i-litsenzi lists the 12 photos (two columns from about 1100 px, one below), all
loaded; axe at 1440 and 390 in both themes and `check:layout` at 320–390: no problem.
