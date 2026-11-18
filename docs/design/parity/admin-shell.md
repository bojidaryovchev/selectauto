# Admin shell, dashboard and states · `app/admin/layout.tsx`, `/admin`, `loading.tsx`, `error.tsx`, `not-found.tsx`, `components/admin/ui`

- Boards (admin canvas): `ad-shell-roles` (fixed: the sidebar per role), `ad-shell-phone` (flow: the phone menu per
  role, the first load, the skip link, a tablet), `ad-dashboard` (d, t, p), `ad-dashboard-states` (flow), `ad-loading`,
  `ad-loading-first`, `ad-error` (+ `-states`), `ad-404` (+ `-states`) (d, t, p), `ad-errors`, `ab-messages`,
  `ab-dialogs` (fixed: the shared messages and dialogs). The design run's notes: `D:/design/selectauto/notes/ad.md`.
- Code on main, read in full: `app/admin/layout.tsx`, `page.tsx`, `loading.tsx`, `error.tsx`, `not-found.tsx`,
  `components/admin/shell/*`, `components/admin/ui/*`, `constants/admin-nav.ts`, `constants/admin.ts` (the lead
  meta).
- Checked before building: 18.11.2026 · Walked after building: 18.11.2026 on the local build, signed in as a real
  admin, observer and supervisor (sessions minted locally; GET only, every other request aborted, so nothing written).
  Walked: the dashboard at 1440, 820, 390 and 320 (each count is the inbox's total less the archive, each status opens
  its filtered inbox, no sideways scroll, no label on two lines); the drawer at 820 and 390 (named „Меню на админ
  панела", focus inside; Escape and „Затворете менюто" close it with the focus back on „Меню"; a link navigates and
  closes it; widening past 1024 px closes it); the skip link (Tab shows it, Enter moves the focus to the content); the
  navigation per role (an observer and a supervisor get Сделки and Обяви, the logo and /admin take them to
  /admin/dogovori, the account card names the role); the 404 (`/admin/dogovori/0`) and the error page with its code
  (an id past the column's range), „Опитайте отново" asking the server again and „Към началото"; the skeletons with
  JavaScript off.

## What the code does today

| # | What the code does today (file:line) | On the board | Outcome |
|---|---|---|---|
| 1 | `<title>` template „%s · Админ · SelectAuto", default „Админ панел · SelectAuto", `noindex, nofollow` (layout.tsx:6-12) | — | — |
| 2 | „Към съдържанието" skip link, shown on keyboard focus (layout.tsx:36-41) | `ad-shell-phone` 5 | As drawn |
| 3 | The back-office gate before any admin query; the proxy blocks `/admin/**` too (layout.tsx:56-67) | — | Kept |
| 4 | From 1024 px a fixed dark sidebar: the wordmark „SELECTAUTO АДМИН" (capitals through CSS), the role's sections in titled groups (titles in capitals through CSS), the current one marked; the links scroll on their own on a short screen (admin-sidebar.tsx, admin-nav-list.tsx, constants/admin-nav.ts) | `ad-shell-roles`: the logo with an „Админ" tag, groups in sentence case, the kit's rows and current-row marker | As drawn; the logo on the dark ground (decision 2); sentence case (decision 10); the sections per role unchanged |
| 5 | The account at the foot: the initial, the name (or e-mail), the roles; „Към сайта" → /, „Изход" → sign out to / (admin-account-card.tsx) | `ad-acc`, tonal small buttons | As drawn |
| 6 | Below 1024 px a top bar: „Меню" and the wordmark; the menu opens a drawer from the left („Меню на админ панела"), with swipe, Escape, an outside press; „Затвори менюто"; it closes on a link and when the window grows past 1024 px (admin-top-bar.tsx, admin-nav-drawer.tsx) | `ad-shell-phone`: the kit's top bar and `ad-nd` drawer, 48 px rows | As drawn; Base UI's drawer kept; formal „Затворете менюто" (decision 1) |
| 7 | While the session is read: the frame with placeholder rows; while a page loads: a title, a line and rows, „Зареждане…" for screen readers (admin-shell-skeleton.tsx, admin-page-skeleton.tsx, loading.tsx) | `ad-loading`, `ad-loading-first` | As drawn |
| 8 | Page header: the title, a badge beside it, a line of context, the actions at the right, a „← back" link above (admin-page-header.tsx) | `ad-ph`, the title in the display face; the back link a text button with an arrow icon | As drawn; the arrow glyph an icon (decision 10) |
| 9 | Shared parts: buttons (primary, secondary, danger, positive, success, ghost), the white card, filter chips, form fields 16 px on phones and iOS, an empty state, a pager („← Назад", „X / Y" on a phone, „Напред →"), result banners (error, success, warning, info) (components/admin/ui) | the kit's buttons, panel, chips, fields, `ad-empty`, `ad-pager`, the kit's alerts | As drawn; the 16 px phone fields kept; the arrows icons |
| 10 | Dashboard, admins only (others → /admin/dogovori): „Табло", „Имате N нови заявки за обработка." or „Няма нови заявки — всичко е обработено.", a card per lead type: its name → the inbox, the listed count, „N нови", the five statuses → the inbox filtered, „Виж заявките →" (page.tsx) | `ad-dashboard`: icon tiles, the count in the display face, „N нови" as a tag, status dots | As drawn; formal „Вижте заявките" with an arrow icon |
| 11 | Error: „Нещо се обърка", the paragraph, „Код:" with a digest, „Опитай отново" → retry, „Към началото" → /admin (error.tsx) | `ad-error`, `-states` | Formal „Опитайте отново"; as drawn |
| 12 | Not found: „Грешка 404", „Няма такъв запис", „Записът не съществува, изтрит е или нямате достъп до него.", „Към началото" → /admin (not-found.tsx) | `ad-404`, `-states` | As drawn |
| 13 | A light page ground | the night ground | The kit's |
| 14 | The content column at most 1280 px wide, centred (layout.tsx: `max-w-7xl`) | `ad-main`: up to 1920 px | As drawn: a wide screen shows more, never wider margins |
| 15 | A missing record's 404 page is sent with status 200: the layout streams before the page calls `notFound()` (layout.tsx, the two Suspense boundaries) | — | Kept; same layout as main, and admin pages are behind sign-in and never indexed |
