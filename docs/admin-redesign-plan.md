# Admin panel — feature audit & redesign plan

Prepared 2026-10-26 against `main` @ `f6006fa`. Companion to
[`contracts-payments-plan.md`](contracts-payments-plan.md) and
[`admin-mail-and-deindex-plan.md`](admin-mail-and-deindex-plan.md).

**Goal (owner request):** replace the top-bar navigation with a left sidebar
whose links sit in a scrollable container; make every admin screen work
smoothly on phones and tablets; trace every admin feature end to end
(hooked up? up to date? working?) — **without changing functionality**.

**How this was researched.** Every admin route, component, query, mutation,
API route, schema and migration was read in full (eight parallel section
audits plus a direct read of the shell). On top of the static reading:

- a local production build (`next build` of `f6006fa`) was rendered GET-only
  at 375 / 768 / 1440 px for the admin, observer and supervisor roles —
  every non-GET request and every router prefetch aborted, the thread page
  `/admin/poshta/[id]` skipped because it writes on view;
- a client-navigation timing test (tap in the nav → time to new content);
- read-only SQL against production (`BEGIN READ ONLY … ROLLBACK`) to measure
  the real impact of the defects found;
- `pnpm run migrate:status` (up to date, 0001–0048), ESLint on the admin code
  (clean), TypeScript via the build (passes).

**Not covered:** production runtime logs (the Vercel connector available here
belongs to another account), and real iOS/Android devices.

Legend: **✔** = re-verified directly (code and/or production data/measurement);
**◇** = found by a section audit through static reading, with file:line, not
re-run. Paths are relative to `apps/web/src/` unless they start with
`packages/`, `docs/` or `infra/`.

---

## 0. Summary

**Shell — confirmed broken at tablet and desktop widths.** The header nav is
one 1 333 px row of 13 non-shrinking links inside a 1 280 px container, so
every admin page scrolls sideways: page width 1 724 px at a 768 px viewport,
1 795 px at 1 440 px ✔ (this is the horizontal scrollbar in the owner's
screenshot). On phones the 13 links sit in a second scrolling row (~96 px of
sticky chrome), and the public site's Viber pill and back-to-top button float
over the admin ✔.

**Phones.** No page overflows at 375 px except the contract detail (3 px, long
attachment file names) ✔, but every register is a desktop table scrolled
sideways inside a 341 px box — the audit log is 1 948 px wide, deposits 1 306,
recipients 1 167, contracts 1 078, users 983 ✔. Inputs are 14 px, so iOS
zooms on every focus. Many controls are 16–36 px tall (139 sub-32 px targets
on the users page) ✔. A tap in the nav leaves the old page on screen with no
feedback for 0.2–0.8 s ✔.

**Features.** Every admin page returns 200 for an admin, and the observer /
supervisor redirects behave as designed ✔; the core flows are wired end to end. But the audit found defects that
matter more than the visuals, several with **production impact** ✔:

| # | Defect | Evidence |
|---|---|---|
| 1 | A typed amount on a САЩ notice to SelectAuto prints „Обща сума за плащане: 0.00 евро" | **13 issued notices** on 6 contracts (2026-062, -072, -090, -095, -097, -104), 11.08–12.10.2026 |
| 2 | A typed amount on the „Кола" stage subtracts the deposit twice | **4 contracts' v1 notices** (2026-100, -115, -119, -120), each re-issued as v2 by hand; 2026-109 (CAD) likely |
| 3 | Deposit deducted 1:1 across currencies | **2026-072**: 1 000 EUR deposit deducted as 1 000 USD |
| 4 | Calculator settings can't be saved at all | **0 rows** in `calculator_settings`; the BC-jeep default 3185 fails the field's `step=10`; mobile.bg markup stuck at 0 % |
| 5 | Removing a role doesn't take effect while the person keeps using the site | Auth.js re-signs the JWT on every visit; roles are read only at sign-in |
| 6 | On iPhone/iPad with iOS ≤ 26, a tap anywhere on the contracts register opens the last contract | `tr.relative` + full-row `::after` link; fixed only in Safari 27 (14.09.2026) |
| 7 | A paid de-index doesn't follow the VIN to newly ingested listings, and doesn't withdraw the paid mobile.bg advert | nothing in ingestion or de-index touches either |
| 8 | From the second PDF a server process renders, letters next to some Latin glyphs vanish („14 480.00 UR") | reproduced deterministically; fontkit's glyph cache (found while fixing #1) |

**Status 2026-10-26:** #1–#6 and #8 are fixed (§5: B1–B5, B8, B9, B13, B26,
B34). Phases 0–3 are done — the new shell (§2) and the building blocks (§3)
are in. Phase 4 has covered Договори, Депозити, mobile.bg, Поща and the three
lead inboxes, each with its P1 fixes (§5). #7 (B6, B7) waits for phase 5.
Next: Тарифи.

**Plan.** Two tracks, kept in separate commits:

- **Track A — redesign, no functional change** (§2–§4): new shell (dark left
  sidebar on desktop, top bar + swipeable drawer below 1 024 px), shared
  building blocks, then a page-by-page responsive pass with container queries.
- **Track B — defect fixes** (§5): P0 first (money documents, settings save,
  role revocation, iOS register), then P1 while each section is being
  restyled.

Sequencing in §6, verification in §7, decisions for the owner in §8.

---

## 1. Baseline (measured, `f6006fa`, local production build, live DB, GET only)

| Check | 375 px | 768 px | 1 440 px |
|---|---|---|---|
| Page-level horizontal overflow | only `/admin/dogovori/[id]` (378 / 375) | **all 15 pages** (1 724 / 768) | **all 15 pages** (1 795 / 1 440) |
| Cause | stage cards — long unbroken file names | header `nav.hidden.md:flex` = 1 333 px of `shrink-0 whitespace-nowrap` links | same |
| Public Viber pill visible after a short scroll | 12 of 15 pages | — | 11 of 15 pages |
| Widest in-page table (scrolls inside a 341 px box) | Дневник 1 948 · Депозити 1 306 · Получатели 1 167 · Договори 1 078 · Потребители 983 · mobile.bg 792 · съответствия 480 | | |
| Controls smaller than 32 px | Потребители 139 · mobile.bg 103 · Договори 71 · Депозити 56 · детайл 8 | | |
| Nav tap → new content (no visual change meanwhile) | Договори 790 ms · Дневник 440 ms · Потребители 200 ms | | |
| HTTP status, admin role | 200 on all 15 pages | | |
| Observer / supervisor | `/admin` → `/admin/dogovori`; admin-only pages → `/` (as designed) | | |

Other facts established:

- `body` reserves `pb-[calc(62px+safe-area)]` below `lg` for the public bottom
  nav, but the unlayered `html, body { padding: 0 }` reset in
  `app/globals.css` beats Tailwind's layered utility, so the reserve is
  **0 px everywhere** (computed style) ✔. Harmless for /admin; worth a separate
  look on the public site, where the fixed bottom nav may cover the footer.
- There is no `error.tsx` or `global-error.tsx` anywhere in `app/`, and no
  `loading.tsx` or `not-found.tsx` under `app/admin/` (the only `loading.tsx` is
  the catalog's) ✔ — so `notFound()` in an admin page renders the **public** 404
  with the public header, and any thrown error shows Next's default error screen.
- No admin page sets its own title; every tab reads „Админ панел | SelectAuto" ✔.
- Production roles: 2 admin, 5 observer, 1 supervisor ✔ (so someone can clear
  the „за изпращане" list after `f6006fa`).
- Production has 0 payment stages still live on cancelled contracts ✔.

---

## 2. Track A — the new shell (no functional change)

### 2.1 Layout

```
≥ 1024 px (lg)                                   < 1024 px
┌───────────────┬──────────────────────────┐    ┌──────────────────────────┐
│ SELECTAUTO    │ ‹main›                   │    │ ☰  SELECTAUTO АДМИН       │ ← sticky top bar, h-14
│ АДМИН         │                          │    ├──────────────────────────┤
│───────────────│  Page header             │    │  Page header             │
│ ▣ Табло       │  (title · text · actions)│    │  cards instead of tables │
│ ВХОДЯЩИ       │                          │    │                          │
│ ✉ Поща        │  Content                 │    └──────────────────────────┘
│ ◎ Carfax      │                          │      ☰ opens a left drawer with
│ ☏ Консултации │                          │      the same nav (Base UI
│ ▤ Оферти      │                          │      Drawer, swipe to close)
│ СДЕЛКИ        │                          │
│ ▧ Договори    │                          │
│ ◫ Депозити    │                          │
│ ОБЯВИ         │                          │
│ ⇪ mobile.bg   │                          │
│ ⊘ Скрити обяви│                          │
│ НАСТРОЙКИ     │                          │
│ % Тарифи      │                          │
│ ⌂ Получатели  │                          │
│ ☺ Потребители │                          │
│ ⟲ Дневник     │                          │
│ (scrolls)     │                          │
│───────────────│                          │
│ Име · роля    │                          │
│ ← Към сайта   │                          │
│ ⇥ Изход       │                          │
└───────────────┴──────────────────────────┘
```

- **Breakpoint `lg` (1 024 px)** for the persistent sidebar. At 768 px a 256 px
  sidebar would leave ~450 px of content — worse than the phone layout.
- **Sidebar:** `fixed inset-y-0 left-0 w-64`, full height (`h-dvh`), three
  rows — brand (pinned), nav (**`flex-1 overflow-y-auto overscroll-contain`** —
  the scrollable container asked for; 14 admin links + group labels need
  roughly 880 px by estimate, so it scrolls on short laptop screens), account footer (pinned:
  name/e-mail and role label from `APP_ROLE_META`, „← Към сайта", „Изход").
- **Content:** `lg:pl-64`, `main` keeps `mx-auto max-w-7xl`, gutters
  `px-4 lg:px-8`, plus **`min-w-0`** so no child can widen the page. Lists switch
  layout on the content's width, not the viewport's (with a sidebar, content at
  1 024 px is narrower than at 768 px) — but through a container on **each list's
  own wrapper, not on `main`**: `container-type: inline-size` applies layout
  containment, which makes the element the containing block of its
  `position: fixed` descendants, and the lead inboxes' detail drawer
  (`fixed inset-0`, not portaled) would be trapped inside the content column.
- **Keep the window as the scroller** (no inner scrolling `main`).
  `ScrollToTop`, `ConfirmDialog`'s scroll lock (`body.style.overflow`), Base UI
  popups and native mobile behaviour (address-bar collapse, tap-status-bar to
  top) all assume it.
- **Look:** dark sidebar/drawer in the site's shell colours (`bg-shell`, the
  public drawer's `from-[#121318] to-[#0b0c10]` gradient) with a brand-orange
  active pill and left accent; content stays light (`#f4f4f5` + white cards).
  This is a proposal; a light sidebar is a one-file change.

### 2.2 Navigation model

One config, two renderers (sidebar + drawer). Groups and labels are a
proposal (§8):

| Group | Item | Route | Shown to (unchanged gates) |
|---|---|---|---|
| — | Табло | `/admin` | admin |
| Входящи | Поща · Carfax · Консултации · Оферти | `/admin/poshta`, `/admin/carfax`, `/admin/zapitvaniya`, `/admin/oferti` | admin |
| Сделки | Договори · Депозити | `/admin/dogovori`, `/admin/depoziti` | `backoffice.enter` (all three roles) |
| Обяви | mobile.bg | `/admin/mobile-bg` | `mobilebg.publish` |
| Обяви | Скрити обяви | `/admin/skriti-obyavi` | admin |
| Настройки | Тарифи · Получатели · Потребители | `/admin/tarifi`, `/admin/poluchateli`, `/admin/potrebiteli` | admin |
| Контрол | Дневник | `/admin/dnevnik` | admin |

- Visibility is computed **server-side** exactly as today (`isAdmin` /
  `can(session, "mobilebg.publish")` in `app/admin/layout.tsx`); pages keep
  their own gates. The config lives in `constants/` (e.g.
  `constants/admin-nav.ts`), items carry an **icon key** (functions can't cross
  the server→client boundary); the client maps key → icon.
- **Active match:** `href === "/admin" ? pathname === "/admin" :
  pathname === href || pathname.startsWith(href + "/")` — whole segments, so a
  future `/admin/dogovori-x` can't light up „Договори" (today's `startsWith`
  can). Set `aria-current="page"`.
- Brand link goes to the role's home: `/admin` for admins,
  `/admin/dogovori` otherwise (today a non-admin bounces through a redirect).
- **Icons:** new files in `components/icons/`, one per file, the house style
  (`viewBox="0 0 24 24"`, `currentColor`, `aria-hidden`; stroke 2, like the
  reused glyphs, so the list reads as one set). Reuse
  `MailIcon`, `EyeOffIcon`, `ClockIcon`, `CloseIcon`; add ~11: grid
  (Табло), file-search (Carfax), message (Консултации), calculator (Оферти),
  file-text (Договори), wallet (Депозити), megaphone (mobile.bg), percent
  (Тарифи), bank (Получатели), users (Потребители), menu, log-out,
  external/arrow-left.
- **Count badges** (new leads, unread mail, „за изпращане") are **not** in
  scope — they would add queries (a functional change). Optional later; note
  layouts don't re-render on navigation, so badges refresh only when an action
  revalidates the layout.

### 2.3 Mobile/tablet top bar and drawer

- Top bar: `sticky top-0 z-30 h-14`, white/95 + blur, border-b; a 44 × 44 menu
  button (`aria-label="Меню"`, `aria-expanded`) and the brand. Nothing else —
  sign-out and „Към сайта" live in the drawer footer.
- Drawer: **Base UI `Drawer`** (`@base-ui/react/drawer`, already a dependency;
  docs: `node_modules/@base-ui/react/docs/react/components/drawer.md`, incl. the
  „Mobile navigation" example). `swipeDirection="left"`, controlled `open`,
  `Drawer.Popup` `h-dvh w-[min(85vw,20rem)]`, safe-area padding, the nav list in
  its own `overflow-y-auto overscroll-contain` region. Gives focus trap, Escape,
  outside-click, scroll lock and swipe-to-close; the public site's hand-made
  drawer has no focus trap and no Escape handling.
- **Close on navigation:** set `open=false` in each link's `onClick` (the layout
  persists across navigations, so the drawer would otherwise stay open).
- **Upgrade `@base-ui/react` 1.6.0 → 1.9.0 first** (own commit; pin the exact
  version — it is one of the few `^` ranges in `apps/web/package.json`). 1.7–1.9 have no breaking-changes
  sections and 1.9.0 (09.10.2026) carries "numerous swipe, velocity, virtual
  keyboard, iOS and CloseWatcher fixes" for Drawer. Re-test the existing
  `Combobox` (also changed in 1.8/1.9). Read the 1.9.0 drawer/dialog docs in full
  before writing the component.

### 2.4 Rendering under `cacheComponents`

- The role-dependent nav reads `auth()` and the client nav reads
  `usePathname()` — both request-time. On `[id]` routes `usePathname` suspends
  (installed docs: `use-pathname.md` → Behavior → Cache Components). Keep the nav
  in **its own `<Suspense>`**, but replace today's `fallback={null}` with a
  **skeleton of the same geometry** (top bar 56 px; sidebar frame with brand and
  placeholder rows) — the installed `layout.md` § "Interaction with loading.js"
  shows exactly this pattern.
- Keep `AdminGate` + the content `<Suspense>` as they are.
- **Add `app/admin/loading.tsx`** (a page-header + list skeleton). Installed
  `loading.md`: "The Fallback UI is prefetched, making navigation immediate";
  `use-link-status.md`: a dynamic route without `loading.js` blocks the
  transition — which is the measured 0.2–0.8 s stall. Re-measure after (target:
  skeleton within ~100 ms of the tap). Per-section skeletons can follow.
- **Add `app/admin/not-found.tsx` and `app/admin/error.tsx`** so a missing
  thread/contract or a thrown error stays inside the admin shell (read the
  installed `not-found.md` / `error.md` for the 16.3 error-boundary props first).
- **Per-page titles:** admin layout `title.template` („%s · Админ · SelectAuto")
  + a static `metadata.title` per page. Pages stay `noindex`.

### 2.5 Keep public-site widgets out of /admin

`ViberGroupPopup` and `BackToTop` are mounted for every route in
`app/layout.tsx` ✔. Done as one wrapper, `components/layout/public-widgets.tsx`,
that renders both except under `/admin`, inside `<Suspense fallback={null}>` in
the root layout (the `ScrollToTop` precedent — `usePathname` needs it under
`cacheComponents`). `FavoritesProvider`'s one favourites fetch on admin pages is
harmless; leave it.

### 2.6 Layers, focus, scroll-lock rules

- z-index ladder: top bar 30 · desktop sidebar 40 · lead drawer 50 (existing,
  not portaled — keep ancestors free of `transform`/`filter`/`contain`, or
  portal it) · nav drawer 60 · toasts 9 999 · `ConfirmDialog` and Base UI
  popups 99 999.
- `ConfirmDialog` resets `body.style.overflow = ""` on close; never open one from
  inside the nav drawer (it would unlock the drawer's scroll lock).
- Skip link „Към съдържанието" → `#admin-main`; visible focus rings
  (`focus-visible:ring-brand`); `aria-label` on both `<nav>`s.

### 2.7 Files

| Change | File |
|---|---|
| Rewrite shell | `app/admin/layout.tsx` |
| New | `app/admin/loading.tsx`, `app/admin/not-found.tsx`, `app/admin/error.tsx` |
| New nav config | `constants/admin-nav.ts` |
| Replace `admin-nav.tsx` with a folder (one component per file + barrel) | `components/admin/shell/{admin-chrome,admin-sidebar,admin-top-bar,admin-nav-drawer,admin-nav-list,admin-nav-icon,admin-account-card,admin-brand,admin-shell-skeleton,admin-page-skeleton,index}` |
| New icons | `components/icons/*-icon.tsx` + `index.ts` |
| Public widgets out of /admin | `components/layout/public-widgets.tsx`, `app/layout.tsx` |
| Titles | each `app/admin/**/page.tsx` (metadata only) |

---

## 3. Track A — shared building blocks and responsive rules

### 3.1 Primitives (`components/admin/ui/`, one per file)

| Primitive | Replaces |
|---|---|
| `AdminPageHeader` (title, description, actions slot, optional back link) | 15 hand-rolled `h1 + p` blocks; actions scattered (e.g. Депозити/Получатели create forms sit *below* their tables) |
| `AdminCard`, `AdminSection` | repeated `rounded-xl border border-line bg-white p-4/p-5` |
| `AdminBanner` (error / success / info / warning) | inline `bg-[#fdecea] text-[#b3261e]`, `bg-[#e8f5ec]…` hex everywhere |
| `AdminButton` (primary / secondary / danger / ghost; `min-h-10`, `min-h-11` for primary) | `px-4 py-1.5` pills at 32–34 px |
| Field styles (`text-base sm:text-sm`, `min-h-11`, `inputMode`, `autoCapitalize`/`autoCorrect` for VIN/IBAN/SWIFT, labels with `htmlFor`) | 14 px inputs (iOS zoom), hidden radios that keyboards can't reach |
| `AdminPagination` (prev / current / next on phones, numbers on wide) | 4 different pagers; none at all on the de-index and mobile.bg registers |
| `AdminEmptyState` | ad-hoc empty rows (one is developer text: „приложете миграция 0038") |
| `adminChipClass` (filter and choice pills, 40 px; the chosen one solid ink) | four pill styles — orange fill, black fill, and orange text on an orange tint (3:1, below AA) |
| `ResponsiveList` pattern: cards below a container width, table above | desktop tables on phones |

### 3.2 Lists: cards ↔ table by container width

Tailwind 4.3 container queries (docs checked): mark each list's own wrapper
`@container` (named, e.g. `@container/list`, when containers nest) — never
`main`, see §2.1; render a card list with `@4xl:hidden` and the table with
`hidden @4xl:block` (896 px; per list pick `@3xl`–`@5xl` or an arbitrary
`@min-[…]`). The lead inboxes already switch to cards below `md` —
the pattern to generalise. Rebalance wide tables (merge №/date, client/car,
VIN under the title) so the main registers fit ~880 px of content (a 1 280 px
laptop with the sidebar). Every action a row offers must be reachable on the
card.

### 3.3 Rules for every page

- No page-level horizontal overflow at 360–1 920 px; give flex/grid children
  `min-w-0`, and long tokens (e-mails, URLs, file names, IBAN, VIN, JSON)
  `[overflow-wrap:anywhere]` or `break-all` (`overflow-wrap: break-word` alone
  does not lower a table column's or grid track's minimum).
- Tap targets ≥ 40 px (44 for primary); no hover-only affordances (e.g. the
  users page's reason-tooltip, the attachment-name `title`).
- Feedback next to the button that caused it (mobile.bg, de-index and
  Потребители show results screens away from the button).
- Dates through one shared formatter with `timeZone: "Europe/Sofia"`
  (`dogovori/page.tsx` already does). Server components today print UTC
  (2–3 h early) and client components mismatch at hydration ◇ — the formatter
  fixes both and changes no behaviour.

---

## 4. Feature-by-feature audit

For each section: what it is, wiring, defects (severity), out of date, and the
redesign work. Track B items are numbered in §5.

### 4.1 Shell and cross-cutting

- **Wiring:** proxy (`backoffice.enter`) → layout `AdminGate` → per-page gates;
  three roles, capability bundles in `constants/admin.ts`; nav split by role ✔.
- **Defects:** header overflow ✔; public widgets in /admin ✔; no admin
  error/not-found/loading ✔; no titles ✔; role revocation (B4) ✔; times in UTC
  ◇ (`lib/admin-lead-view.ts`, `dnevnik/page.tsx`, `dogovori/[id]/page.tsx`,
  `tarifi/page.tsx`); client components format dates without a time zone ✔
  (`mail-inbox.tsx`, `mail-thread-view.tsx`) ◇ (`payment-stage-card.tsx`,
  `users-manager.tsx`, `mobilebg-advert-list.tsx`, deposit/contract document
  buttons) — on Vercel's UTC servers that is a hydration mismatch on full loads
  (inferred, not observed).
- **Prefetch runs whole pages** ✔ (measured before and after the shell, same
  result): every admin `<Link>` that scrolls into view prefetches its route, and
  the prefetch response is the **full page with its data** (the `/admin/dnevnik`
  prefetch carries the audit rows, `/admin/depoziti` the deposits; 25–165 KB
  each). A desktop admin page view therefore renders the ~13 sidebar
  destinations in the background — each with its auth and queries. That is why
  a tap now shows the next page in 50–80 ms, and it is the default for
  `cacheComponents` without `partialPrefetching`. Fine for eight staff
  accounts; if it ever matters, hover-prefetch the sidebar or adopt Partial
  Prefetching (App Shell only). Its one real side effect is B35.
- **Out of date:** ~~`admin-nav.tsx` doc comment~~ (file removed in phase 2);
  "layout gates to admins" comments in the carfax, zapitvaniya,
  oferti, tarifi and poluchateli pages; `update-lead.mutation.ts` "proxy blocks
  non-admins" ◇ (see §9).

### 4.2 Табло (`/admin`)

- Lead counts per type and status; admin only (non-admins → `/admin/dogovori`) ✔.
- **Wiring:** OK — three grouped counts, uncached; `updateLead` revalidates the
  layout ◇.
- **Defects:** card total includes archived leads while the inbox's „Всички"
  excludes them (P2) ◇.
- **Redesign:** `AdminPageHeader`; works on phones already ◇.

### 4.3 Поща (`/admin/poshta`, `/admin/poshta/[id]`)

- Inbound `info@` mail via Resend webhook → threads; reply as `info@`; status;
  hourly reconcile cron. Admin only ✔.
- **Wiring:** webhook → ingest → list → thread → reply OK ◇; Resend 6.17.2 calls
  match the installed types ◇. **A page view writes:** the server pulls missing
  bodies from Resend and saves them, and the client marks the thread read on
  mount ✔. Because the inbox's thread rows are `<Link>`s and a prefetch renders
  the whole page (§4.1), **opening the inbox already runs that server half for
  every visible thread** — Resend calls and body writes for threads nobody
  opened (B35) — from the code plus the prefetch behaviour measured on the
  other admin routes; not run on a thread, since the local tests abort those
  URLs to avoid the writes.
- **Defects:** status dropdown keeps the old value after a reply moves the
  thread to „В процес" (B20) ✔; `MAIL_IGNORE_SENDERS=` (empty, as
  `.env.example` ships it) turns the robot-mail filter off — `??` instead of
  `||` (B21) ✔; second consecutive reply loses `In-Reply-To` and the
  Reply-To target (B22) ◇; the composer shows „До {participant}" but sends to
  Reply-To when present ◇; a follow-up to a „Затворен" thread stays closed ◇;
  failed body fetches retry forever with no timeout ◇; `?q=a&q=b` → 500 ◇;
  inbound HTML shipped to the client ◇. Not built (by design so far): assign/
  claim, attachment download, audit rows, compose new, bounce handling ◇.
- **Out of date:** `lib/inbound-mail.ts` still describes phase 0 and claims
  passthrough never downloads payloads (it does) ◇; `route.ts` "Phase 0" ◇.
- **Redesign:** chips/pager 36 → 44 px; search input 16 px + a visible search
  button; wrap long subjects, participants and attachment names; collapse quoted
  history (display only).

### 4.4 Carfax · Консултации · Оферти

- Three lead inboxes: status tabs, search, paging, detail drawer with status +
  notes. Admin only ✔.
- **Wiring:** public forms → BotID → insert + email → inbox OK ◇.
- **Defects:** Консултации „Интерес" column shows „Да"/„Не" for every inquiry —
  the modal stores the yes/no answer in `specific_model` and the mapper prefers
  it over brand + model (B23) ✔; unsaved notes lost when the status changes or
  on Escape (B24) ◇; Оферти never shows vehicle type or US auction location
  (stored in `breakdown_json.inputs`) (B25) ◇; phone search in local format
  (`0888…`) finds nothing ◇; status/notes changes not audited ◇; untrusted
  page-URL / `mailto:` links ◇.
- **Redesign:** cards already below `md` — move the switch to a container
  query; filter pills 32 → 40 px; 16 px search; drawer value column
  `minmax(0,1fr)` + `[overflow-wrap:anywhere]` (long URLs push it sideways);
  drawer gets dialog semantics (`role="dialog"`, focus) and the public widgets
  stop covering its ✕.

### 4.5 Договори — register, create, detail, edit, numbering, PDFs

- Register (search, status, paging, stage chips, „за изпращане" list),
  creation wizard per market, detail, edit, renumber, next-number, delete
  cancelled, contract PDFs (versioned). Gates per capability ✔.
- **Wiring:** number minting atomic (counter row lock + UNIQUE) ◇; PDFs render
  from frozen snapshots, S3 best-effort ◇; download route enforces
  `canSeeRecord` ◇.
- **Defects:** iOS ≤ 26 register tap hijack (B8) ✔; create uses the CAD amount
  and rate on non-Canada markets if the user switched market (B26) ◇; renumber
  leaves every stage's основание on the old number (B27) ◇; the edit form keeps
  stale state and writes back old status/основание after a mark-paid or
  renumber (B28) ◇; edit doesn't re-derive statuses and accepts any status ◇;
  „за изпращане" not invalidated by edits ◇; clients can't be edited or
  deduplicated ◇; deleting a contract leaves its PDFs as old S3 versions
  (versioned bucket, no `DeleteObjectVersion`) ◇; amount-in-words: „1 …
  долара", „1 евроцента", throws ≥ 1 000 000 ◇; register search can't find by
  ЕГН/ЕИК, `%`/`_` unescaped ◇.
- **Out of date:** "five points / four stages" comments in ~15 places; `us_ca`;
  "never deleted"; „за посредничество" copy on `/nov` and the register (EU
  contracts are доставка) ◇ (§9).
- **Redesign:** register → cards + compact table, no row overlay (link in the
  first cell, row click via a cell-level target); „за изпращане" collapsible
  with a count; detail header wraps (title + status); stage grid by container
  width (1 / 2 / 4 columns); wizard inputs 16 px with `inputMode`, focusable
  radios, a sticky bottom action bar on phones; back link drops (sidebar).

### 4.6 Договори — payment stages, notices, payments, attachments

- Per-stage notices (recipient rules, rate, typed amount, основание, падеж,
  preview, versioned PDFs), mark paid / partial, revert, attach proofs, mark
  notice sent (supervisor), overdue cron ✔ (gates) ◇ (flows).
- **Defects:** zero-total notices (B1) ✔; deposit subtracted twice (B2) ✔;
  preview computed separately from the PDF — typed amount, rounding to the whole
  euro, CAD, fallback основание all differ (B9) ◇; uploads over ~4.5 MB fail on
  Vercel although the UI says 8 MB (server-action body; Vercel caps request
  bodies at 4.5 MB) (B10) ◇; a failed proof upload after „Запази плащането"
  invites a retry that records the payment twice (B11) ◇; admins can't attach a
  proof without recording a payment (B12) ◇; regenerating keeps a past падеж, so
  the stage flips back to „Просрочено" next morning ◇; amount label currency ≠
  printed currency for some recipient/market pairs (owner rule needed) ◇;
  concurrent mark-paid can lose a payment (no row lock) ◇; a mis-click on
  „Отбележи като изпратено" can't be undone in the UI ◇.
- **Redesign:** card actions `min-h-10` and wrapping; confirm row wraps; long
  file names/основание break; attach control focusable; panels don't stretch the
  neighbour card (`items-start`).

### 4.7 Депозити

- Deposit contracts: create (existing/new client), status select, delete
  cancelled, PDF versions, numbering; deduction in the contract wizard ✔ (gates).
- **Defects:** currency mismatch (B3) ✔; deduction clamped to Точка 1 at
  creation and frozen — a deposit can be „used" for 0 (B13) ◇ (not seen in
  production: all 7 deductions equal their deposits ✔); cancelling a contract
  leaves its deposit „used" and locked ◇; no transition rules (a returned deposit
  can become paid again) ◇; form not reset after create — a second click
  creates a duplicate deposit and client ◇; deposit release/deletion erases or
  skips audit history ◇; deposit PDF regenerates without confirmation ◇;
  observers/supervisors receive every client's ЕГН/ЕИК, address and phone (owner
  decision) ◇.
- **Redesign:** cards with actions visible; „+ Нов депозит" in the header
  opening the form at the top (not below the table); 16 px inputs.

### 4.8 Тарифи

- Calculator settings (FX, duty/VAT, Korea fees, US auction fees, Canada, BG
  transport, mobile.bg markup) and the US inland + container tariff paste with
  version history. Admin only ✔.
- **Wiring:** settings → public `/api/calc-config` (estimator), offers,
  mobile.bg; tariffs → `/api/us-tariffs`, offers, mobile.bg ◇. The root sheets
  `LocalTransportationPrices_plus_235_redacted.xlsx` /
  `Container_Prices_plus105.xlsx` parse to 596 + 44 rows, identical to the
  built-in table ◇.
- **Defects:** settings can't be saved (B5) ✔; a paste of ≥ 50 rows replaces
  the whole table immediately — no preview, confirm or undo (B14) ◇; no
  rollback/re-activate for settings or tariffs ◇; changes use
  `revalidateTag(…,"max")` (stale on next visit) + browser `max-age` 300/3 600,
  so the estimator and the server can disagree (B15) ◇; a DB error is cached as
  defaults for a day ◇; no audit of price changes ◇; two yards' names mangled by
  multi-line cells on paste ◇; `/api/calc-config` publishes the mobile.bg
  markup (B16) ✔; clearing a field saves 0 ◇; English zod messages ◇. **Owner
  decision:** 56 of 596 yards use the cheapest terminal where the spec says the
  highlighted one (−$800…+$450 sedan) ◇.
- **Redesign:** one column on phones (two cramped columns today), container
  query to 3; 16 px inputs; sticky save bar; history as cards.

### 4.9 Скрити обяви

- Paid de-index by VIN: lookup → review → apply (410 + catalog exclusion +
  IndexNow) → revoke; request register ✔ (gates).
- **Wiring:** apply/revoke run the `_counted` recomputes in one transaction and
  `updateTag` (correct API) ◇; the proxy 410 and catalog exclusion hold for
  stamped rows ◇.
- **Defects:** not forward-applied to new rows with the same VIN (B6) ✔; lookup
  by lot number unreachable for all-digit lots (treated as a car id) (B17) ✔;
  request fields carry over to the next customer ◇; re-apply silently drops the
  new request data (`onConflictDoNothing`) ◇; revoke has no confirmation (next
  to the red button) ◇; cars without a VIN can't be de-indexed and the message
  says "not found" ◇; live mobile.bg advert not withdrawn (B7) ✔; UI implies a
  Bing block that is never placed ◇; register has no pager ◇; every apply
  flushes the whole `cars` cache tag (cost, not correctness) ◇.
- **Not built (per plan):** Bing API, delisting certificate PDF, per-request
  status record ◇.
- **Redesign:** review table and register as cards; result banner next to the
  buttons; pager.

### 4.10 mobile.bg

- Find a car → preview against mobile.bg's live lists → confirm (weekly
  charge) → publish/correct; register; delete; brand/model mapping desk.
  `mobilebg.publish` (all three roles) ✔.
- **Wiring:** end to end OK ◇. Locally the import account isn't configured (by
  design — nothing can be sent from a dev machine).
- **Defects:** adverts never follow the car (sold, archived, de-indexed) — still
  billed (B7) ✔/◇; no server guard against two simultaneous publishes (two paid
  adverts) ◇; an advert can exist without its `ida` recorded (no timeout, no
  reconcile) ◇; a relisted VIN gets a second advert ◇; register has no pager ◇;
  lot-number search broken like B17 ◇; generated description says „включва
  ДДС" whatever the VAT status ◇; engine/transmission/km required but no input ◇;
  a Korean car photo hot-linked from `sellers.import-motor.com` shows broken —
  the host's response is refused cross-origin (`ERR_BLOCKED_BY_RESPONSE.NotSameOrigin`) ✔.
  **Todo item „description … default with ability to edit":** a default is
  generated but shown only as a placeholder — editing replaces it entirely, and
  nothing is stored, so a correction silently reverts to the generated text ◇.
- **Redesign:** status/errors next to the action buttons (sticky action bar on
  phones); description textarea pre-filled and taller; register/desk as cards
  with „Изтрий"/„Премахни" reachable (and confirmed).

### 4.11 Получатели

- Payment recipients CRUD (no delete, by design); SelectAuto row protected.
  Admin only ✔.
- **Wiring:** OK; notices snapshot recipient data, so edits never change issued
  notices ◇.
- **Defects:** the seeded SSANCAR IBAN `180-008-400167` fails the IBAN regex, so
  that row can't be saved even to toggle „Активен" ◇; SelectAuto bank data has a
  second, hard-coded copy used by the contract/deposit PDFs ◇; recipients with
  missing bank data look complete until generation fails ◇.
- **Redesign:** cards; the edit form opens next to the row / scrolls into view
  (today it renders below the table, so on a phone „Редактирай" seems to do
  nothing).

### 4.12 Потребители

- All accounts; toggle Администратор / Наблюдаващ / Наблюдаващ – всички
  договори; own row locked. Admin only ✔.
- **Defects:** role removal (B4) ✔; one unconfirmed 16 px tick grants full admin
  ◇; whole user base listed oldest-first with no search or paging ◇; two admins
  demoting each other at once can leave zero admins ◇.
- **Redesign:** one card per user with 44 px switches and role labels; a
  confirm for granting/removing Администратор (B29); legend collapsible.

### 4.13 Дневник

- `contract_events`, entity chips, 100 per page. Admin only ✔.
- **Defects:** missing labels for `numbering`, `mobilebg_advert`, `deleted`,
  `published` (raw codes) ◇; deleting a contract/deposit deletes its earlier
  history ◇; rows can repeat/vanish across pages (`ORDER BY created_at` only,
  same timestamp per transaction — add `id DESC`) ◇; rows don't link to the
  record and payment rows don't carry the contract ◇; the page claims „всички
  действия" but leads, mail, tariffs and mappings aren't logged ◇.
- **Redesign:** cards on phones; JSON details as a key/value list.

---

## 5. Track B — defects to fix

Separate commits from the restyling. P0 = money documents, security, or a
feature that cannot be used.

### P0

**How B1–B3 should work — settled from the owner's spec**
(`Техническо_задание_договори_и_плащания_SelectAuto_ФИНАЛ_с_депозит_и_USD_курс.pdf`)
and the sample notices:

- **B1:** §16.1/§16.4/§16.5 — on САЩ → SelectAuto the USD value comes from the
  contract, the курс is typed, and the EUR value "се изчислява автоматично и не се
  редактира ръчно". The typed amount (a later owner addition: contract sums are
  estimates) therefore replaces the **USD** figure; the euro is still USD × курс.
- **B2:** §14.2 + the Korea sample (line 15 480, total 14 480) — the stage line is the
  gross Точка 1 and the deposit is its own negative line. The typed amount replaces
  that gross line; the placeholder and label were what misled operators.
- **B3:** the spec is silent on a deposit in another currency than the contract.
  Deposits carry their own currency (`budget_currency`, EUR or USD) and partner
  notices may not use a rate (§16.2/§16.4), so the operator states the deduction in the
  contract's currency when the two differ.

**Done 2026-10-26:** B1, B2, B3, B4, B5, B8, B9 and B34 below, and from P1
B13 (a deduction larger than Точка 1 is refused) and B26.

Also fixed during the phase-4 pass, outside the numbered list: the new-deposit
form resets after a create (a second click made a duplicate deposit and
client); a deposit PDF asks before issuing a new version; „Премахни" on a
mobile.bg mapping asks first; the reply box names the address the reply really
goes to (Reply-To); and a dropped connection during a server action is reported
next to the button in mobile.bg, the mail thread and the lead drawer — before,
it replaced the page with the error screen ✔ (reproduced by aborting the
request).

| # | Defect | Fix sketch | Where |
|---|---|---|---|
| B34 | From the second document a process renders, PDFs lose letters next to glyphs fontkit cached with `codePoints = []` (composite components fetched by id while subsetting) ✔ | Wrap `getGlyph` on the PT Sans fontkit instances so a lookup with code points fills empty ones (done; fontkit 2.0.4 is the latest release) | `pdf/render.ts` |
| B1 | Zero-total САЩ→SelectAuto notice when an amount is typed ✔ (13 issued) | Decide the typed amount's currency per variant (label says EUR → treat as the EUR payable, keep the USD side derived), compute the total from it; never allow a 0 total (server refuses) | `lib/notice.ts`, `generate-payment-notice.mutation.ts`, `payment-stage-card.tsx` |
| B2 | Deposit subtracted twice on „Кола" with a typed amount ✔ (4 v1 notices) | Define the typed amount as the **net payable** (what the placeholder shows) and add the deduction back for the gross line — or label the field „сума преди депозита"; owner picks | same |
| B9 | Preview ≠ PDF | Show the computed total in the preview from the same builder the PDF uses — `buildNoticeSnapshot` is pure (type-only DB import, `lib/money` has no imports), so either call it client-side with the same rows or add a dry-run action | same |
| B3 | Deposit currency ≠ contract currency ✔ (2026-072) | Block, or convert at a stated rate; owner decides how to settle 2026-072 | `create-contract.mutation.ts`, `contract-form.tsx` |
| B4 | Removed roles keep working ✔ | Re-validate roles server-side every few minutes — e.g. in `auth.ts`'s `jwt` callback with a `rolesCheckedAt` claim, or in the `lib/admin.ts` gates with a short per-instance cache. The proxy's DB-free `authConfig` keeps the cookie's roles, which is acceptable because every page and action re-checks | `auth.ts` or `lib/admin.ts` |
| B5 | Calculator settings can't be saved ✔ | `step="any"` (zod stays the rule); then let the owner set the mobile.bg markup | `components/admin/calc-config-form.tsx` |
| B8 | iOS ≤ 26: register taps open the last contract ✔ | Hotfix: drop `relative` from `<tr>` and the `::after` overlay (link in the first cell) — the redesign replaces the row anyway | `app/admin/dogovori/page.tsx` |
| B6 | De-index not forward-applied ✔ | In ingestion, stamp `deindexed_at` on cars whose normalized VIN has an active request (inside the cars upsert or a post-sync step), then recompute | `packages/functions/shared/db.ts` (+ a backfill check for rows already leaked) |
| B7 | Paid mobile.bg advert survives de-index / sale ✔ | On apply-deindex delete adverts of the affected car ids; flag sold/archived cars in the register (or a daily check) | `mutations/deindex/apply-deindex.mutation.ts`, `mutations/mobilebg/*` |

### P1 (fix while restyling the section)

| # | Defect | Status |
|---|---|---|
| B10 | Proof uploads > ~4.5 MB fail on Vercel — presigned PUT from the browser, or a client-side ≤ 4 MB check with a clear message | fixed — 4 MB checked in the browser and on the server, with a clear message; the action body limit is 4.5 MB, Vercel's cap (all 21 production uploads are < 720 KB ✔) |
| B11 | Failed upload after recording a payment invites a double payment — close the form once the payment succeeds; attach separately | fixed |
| B12 | Admins can't attach a proof to a paid stage / without paying — show the standalone attach to every `payments.attach` holder | fixed |
| B13 | Deposit deduction clamped to Точка 1 and frozen — reject when Точка 1 < deposit, or recompute on edit | fixed (rejected) |
| B14 | Tariff paste replaces everything without preview/confirm/undo — summary + diff vs the active version, confirm on row-count drop, re-activate older version | |
| B15 | Tariff/settings changes are stale on the next visit — `updateTag` in both actions, short/no browser `max-age` | |
| B16 | `/api/calc-config` publishes the mobile.bg markup — strip it from the public payload | |
| B17 | Lot-number lookup unreachable (de-index and mobile.bg) — query id **and** lot, show both kinds of hit | mobile.bg fixed (26 713 lot numbers equal another car's id ✔); de-index with Скрити обяви |
| B18 | De-index: reset request fields per lookup; update (not ignore) a repeated request; confirm revoke; allow URL lookups for VIN-less cars or say why not | |
| B19 | mobile.bg: guard concurrent publish (row state check), record/reconcile `ida`, warn on a second advert for the same VIN, store the per-advert overrides incl. description | phase 5 |
| B20 | Mail status dropdown stale after reply | fixed |
| B21 | `MAIL_IGNORE_SENDERS` empty → filter off (`??` → `||`) | fixed |
| B22 | Second reply loses threading / Reply-To (filter the last inbound by direction) | fixed (115 of 152 inbound mails carry a Reply-To ✔) |
| B23 | Консултации „Интерес" shows „Да"/„Не" — show brand + model; relabel the yes/no answer | fixed |
| B24 | Lead drawer drops unsaved notes on status change / Escape | fixed — a status change keeps the drawer open; any close asks while the note is unsaved |
| B25 | Оферти: show vehicle type and US auction location | fixed |
| B26 | Contract create: ignore CAD fields outside Канада (as `update-contract` already does) | fixed |
| B27 | Renumber: update each stage's default основание too | fixed — also a changed основание on edit; contract 2026-114's notice 204 (printed „Договор № 2026-113") is for the owner to re-issue |
| B28 | Contract edit form: re-key on data change so it never writes back stale status/основание | fixed |
| B29 | Users: confirm before granting/removing Администратор | |
| B30 | Дневник: labels for every written event; `id DESC` tiebreaker; stop deleting history on delete | |
| B31 | Times in Europe/Sofia everywhere (shared formatter) | `lib/sofia-time.ts`; done in Договори, Депозити, mobile.bg, Поща, lead inboxes |
| B32 | Recipients: SSANCAR IBAN format; flag rows with missing bank data | |
| B33 | Pagers for the de-index and mobile.bg registers | mobile.bg fixed; de-index with Скрити обяви |
| B35 | Inbox prefetch pulls thread bodies — `prefetch={false}` on the thread links, or move the Resend body fetch out of the page render | fixed (`prefetch={false}`; the inbox now sends 0 thread requests ✔) |

### P2 (housekeeping)

Cancelled contracts should cancel their stages (0 affected today ✔); overdue
cron ignores partially paid stages; deposit transition rules; client edit and
dedupe; S3 deletes on a versioned bucket keep old versions (decide retention);
`notice_unsent` has a label but no writer; amount-in-words singular/limit;
`?q=a&q=b` crashes (mail, contracts); English validation messages;
`RATES_VERIFIED_AT` hard-coded; stale comments and docs (§9).

---

## 6. Phases

Each phase ships on its own to `main` (Vercel production), smallest first.

| Phase | Content | Done when |
|---|---|---|
| 0 — Hotfixes ✔ | B5, B8 (one-line each), B1 + B2 + B9 (notice math + server preview), B4 | owner can save settings; register taps right on iOS 26; a typed amount never yields a 0 or double-deducted total; a removed role stops working within minutes |
| 1 — Base UI 1.9.0 ✔ | dependency bump only | Combobox flows unchanged (filters, notice recipient, mobile.bg pickers) |
| 2 — Shell ✔ | §2 complete: sidebar, top bar + drawer, nav config, icons, skeleton, `loading/not-found/error`, titles, public widgets out | §7 checks pass for all 15 pages × 3 roles — passed: 134 loads at 360–1 920 px, no page overflow, no public widgets, nav and active link right per role; tap → next page 50–80 ms (desktop, prefetched) or skeleton ~40 ms then page ~350 ms (drawer) |
| 3 — Building blocks ✔ | §3 primitives + container-query list pattern | used by at least one page end to end (Договори register) |
| 4 — Page pass (in progress) | Договори (register → detail → create) ✔ · Депозити ✔ · mobile.bg ✔ · Поща + lead inboxes ✔ · Тарифи · Скрити обяви · Получатели · Потребители · Дневник · Табло — with that section's P1 fixes as separate commits | per page: §7 checks + feature walk-through unchanged |
| 5 — Remaining P0/P1 | B6, B7 (touch ingestion / paid adverts — careful, own commits), B10–B19 left over | |
| 6 — Cleanup | §9 stale comments/docs, unused exports, `docs/02` tables | |

Order inside phase 4 follows daily use: observers and the supervisor work in
Договори / Депозити / mobile.bg, most likely on phones.

---

## 7. Verification

- `pnpm run check` (type-check + lint) and `next build` on every phase.
- **Render pass (the one used for §1):** local production build, minted JWT per
  role, Playwright (Chromium) at 360, 375, 390, 768, 1 024, 1 280, 1 440,
  1 920 px; abort every non-GET and every request for `/admin/poshta/<id>`
  (a thread page writes on view, and a prefetch is a view — §4.1). Other GET
  prefetches may run: they are what makes navigation instant. Assert per page ×
  role: no page-level horizontal overflow; no Viber pill / back-to-top in
  /admin; nav present and correct for the role; h1 present; no error boundary;
  screenshots before/after.
- **Navigation:** tap → skeleton ≤ ~100 ms (re-run the §1 timing test).
- **Devices:** iPhone on iOS 26 **and** 27 (the `<tr>` containing-block bug
  differs), an Android phone, an iPad in portrait/landscape: drawer swipe, safe
  areas, 16 px inputs (no zoom), dialogs in landscape.
- **No functional change (Track A):** the diff touches only layout/UI files;
  routes, gates, queries and actions unchanged; walk each feature once per role.
- **Track B:** read-only SQL before/after for B1–B3 (the queries used for this
  audit), unit checks for `buildNoticeSnapshot` cases (САЩ/SelectAuto ± typed
  amount, deposit, Канада CAD, customs EUR).

---

## 8. Decisions for the owner

1. ~~Sidebar groups and labels (§2.2), dark vs light sidebar.~~ Decided: dark,
   grouped as proposed.
2. Count badges in the sidebar — later, or not at all?
3. ~~Typed amount on a notice: net or gross on the „Кола" stage; which currency
   on САЩ→SelectAuto (B1/B2).~~ Settled from the spec — see §5 P0.
4. The 13 zero-total notices and the 4 double-deducted v1 notices (all
   superseded or marked sent): re-issue, or leave? And settling 2026-072's
   deposit (1 000 EUR credited as 1 000 USD; contract fully paid).
5. Preferred (highlighted) vs cheapest terminal for 56 yards.
6. The mobile.bg markup % (0 % today) once B5 is fixed; and Korea adverts
   including commission + markup vs US/Canada markup only.
7. Should the supervisor be able to attach payment proofs on every contract
   (inherited from the observer bundle)?
8. Should observers/supervisors see every client's ЕГН/ЕИК in the pickers?
9. mobile.bg description: default text pre-filled and editable, stored per
   advert?

---

## 9. Stale docs and comments (fix in phase 6)

- ~~`components/admin/admin-nav.tsx`~~ (removed in phase 2); "layout gates to
  admins" in `carfax`, `zapitvaniya`, `oferti`, `tarifi`, `poluchateli` pages;
  `update-lead.mutation.ts` / `list-carfax-requests.query.ts` proxy claims;
  "admin-gated" in `list-recipients`, `list-clients`, `list-deposits`,
  `list-available-deposits`, `get-contract` queries.
- "five points / four stages" and `us_ca` across contracts code and
  `packages/db/schema.ts`; "append-only / never deleted" (schema 957–964,
  1027–1040); `0043`/`0046` "forward-applying" claims (B6).
- `lib/inbound-mail.ts` (phase-0 text, passthrough claim); mail route "Phase 0";
  `.env.example` (`CRON_SECRET` comment, missing `MOBILEBG_USERNAME/PASSWORD`).
- `proxy.ts`, `docs/11` §3 "no cache lag" vs the 30 s snapshot;
  `sold-lot-gone.ts` 2026-09-21 date; `lib/indexnow.ts` route names;
  `lib/cache-tags.ts` "no revalidateTag wired"; `next.config.ts` "no use cache:
  remote" (see `admin-mail-and-deindex-plan.md` §3.6, still open).
- `tariff-parse.ts` "coloured cell is the min price"; "immediately" in the
  tariff/settings actions; `update-calc-config` "trivial rollback".
- `docs/02-data-model-and-tables.md`: lead tables "write-only", no
  `calculator_offers`, no lifecycle/roles columns, history stops at 0026.
- `apps/web/AGENTS.md` cache line (`updateTag`).
