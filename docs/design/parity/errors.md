# Error pages · 404 (`app/not-found.tsx`), 410 (`proxy.ts`), errors (`app/error.tsx`, `app/global-error.tsx`)

- Boards: `info-404` (d, t, p), `info-410` (d, t, p), `info-500` (d, t, p), `info-500-flow` (phone flow: no code; the
  root layout's error), `info-meta` (their titles and robots). The design run's notes: `D:/design/selectauto/notes/in.md`
  (rows 91–92, the new strings, the 410 body).
- Code on main, read in full: `app/not-found.tsx`, `proxy.ts`, `lib/sold-lot-gone.ts`, `app/admin/error.tsx` (the
  error text's source), `app/admin/not-found.tsx`, `app/layout.tsx`, `components/layout/site-footer/site-footer.tsx`,
  `next.config.ts`. Next 16.3.1's own docs, read in full: `error.md` (error.js, global-error), `proxy.md`,
  `next-response.md`, and `not-found.md`, `font.md` where they bear on this.
- Checked before building: 18.11.2026 · Walked after building: 18.11.2026, at 1440, 820, 390 and 320. 404: status 404,
  Next's noindex, the title, eyebrow, numeral (decorative), all six links with their flags and calculator icon.
  410 for a car archived on 23.06.2026: status 410, `text/html`, `x-robots-tag: noindex` and the site's security headers,
  8.1 KB (2.7 KB gzipped); HEAD 410; a client-side navigation to it loaded the page at the car's address; a car sold
  today still 200. Errors, from three temporary hooks removed before the commit: a server error showed „Код:" and the
  digest, a browser error none, both with the header and footer and no noindex; „Опитайте отново" fetched the page
  again; an error in the root layout showed `global-error` with the night ground, the site's fonts and the logo bar
  only. The title „Нещо се обърка — SelectAuto" in all three. No sideways scroll.

## What the code does today

| # | What the code does today (file:line) | On the board | Outcome |
|---|---|---|---|
| 1 | 404: `<title>` „Страницата не е намерена — SelectAuto"; Next adds `noindex` itself (not-found.tsx:19-21) | `info-meta` | — |
| 2 | 404: the header (in a Suspense boundary, as the path isn't known at prerender) and the footer (not-found.tsx:35-37, 66) | the shell | — |
| 3 | 404: „Грешка 404" and the H1 „Страницата не е намерена" in capitals through CSS; „Страницата, която търсите, не съществува или е преместена. Разгледайте…" (not-found.tsx:41-50) | `info-404`: an outlined „404" numeral, the eyebrow, H1 and lead | Sentence case (decision 10). The numeral is decorative, hidden from screen readers |
| 4 | 404: six pill links: Всички автомобили, Внос от Корея, Внос от САЩ, Внос от Канада, Калкулатор за внос, Контакти (not-found.tsx:23-30, 51-62) | chips in a nav named „Основни страници", flags on the import links, a calculator icon, two to a row on a phone | As drawn; the nav's name is one of decision 12's labels |
| 5 | 410 for a car archived 90+ days ago or de-indexed (paid): status 410, `x-robots-tag: noindex`, **no body**, so a person sees a blank page (proxy.ts:41-50; REDESIGN.md, bugs) | `info-410`: an outlined „410", „Обявата вече не е налична", the lead, „Вижте активни обяви" to the catalog, five of the 404's links. It names no car: a paid delisting must not reveal the vehicle | Fixed: the 410 carries the page. Status and header unchanged. See the note below |
| 6 | No 410 title or description | `info-meta`: „Обявата вече не е налична — SelectAuto", the lead as description, noindex | New (decision 12) |
| 7 | No error page: an error in a page shows Next's unbranded screen (REDESIGN.md, bugs) | `info-500`, `info-500-flow` | Fixed: `app/error.tsx` with the header and footer; the text is `app/admin/error.tsx`'s word for word, its button formal („Опитайте отново", decision 1) |
| 8 | (admin, kept) „Код: …" only when the error has a digest, which only server errors do (admin/error.tsx:25) | `info-500` shows the code; `info-500-flow` 1 without it | As drawn |
| 9 | (admin, kept) „Опитай отново" calls `retry()`, which re-fetches and re-renders the page (admin/error.tsx:32) | „Опитайте отново" with a rotate icon, primary | Formal (decision 1) |
| 10 | (admin) „Към началото" → /admin (admin/error.tsx:35-38) | „Към началото", secondary | → / on the public page |
| 11 | No title on an error | `info-meta`: „Нещо се обърка — SelectAuto", from a `<title>` in the component (an error boundary can't export metadata); no noindex | New (decision 12) |
| 12 | An error in the root layout itself: Next's bare screen | `info-500-flow` 2: `global-error.tsx`, its own document with the logo bar only, no header, tabs or footer | Fixed: `app/global-error.tsx`, with the site's styles and fonts |
| 13 | An unknown make or model, and a missing or malformed car id, call `notFound()` inside the streamed body: the 404 page arrives after HTTP 200 (a soft 404) (avtomobili/marka/[make]/page.tsx:87-90, 132-135; […]/[model]/page.tsx:88-91, 150-153; avtomobil/[id]/page.tsx:52-57, 150-155) | `info-meta` findings: the unknown make's soft 404 | Fixed: `generateMetadata` calls `notFound()` first. Metadata blocks the response (`htmlLimitedBots`), so the 404 page goes out with status 404. Real pages unchanged |

**The 410's body.** The proxy is the only place a 410 can come from: the car page streams a 200 shell (`lib/sold-lot-gone.ts`).
Next's docs give two ways for a proxy to answer: rewrite to a route, or return a response. A rewrite with a status of
its own is not documented, and nothing shows that Vercel keeps it; a lost 410 would be an SEO regression. So the proxy
keeps returning the response itself, now with a small static HTML document: the board's content, links and look, under
a top bar with the logo, as `global-error` draws it, in the system's fonts (the site's fonts have build-hashed names).
It costs no extra request or render, and stays a few KB for the crawlers that make most of the car-page traffic.
