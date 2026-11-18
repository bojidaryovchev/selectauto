# Shell · header, phone top bar, bottom tabs, drawer, footer, floating widgets

- Boards: `ac-hdr` (fixed, desktop header and profile menu), `ac-drawer` (flow, phone menu and profile),
  `ac-drawer-tab` (flow, tablet), `ac-float` (flow, phone widgets), `ac-float-desk` (fixed, desktop widgets), the kit's
  header, footer and tab bar partials, and `kit-layout`.
- Code on main, read in full: `components/layout/site-header/{site-header,mobile-bottom-nav,nav-hamburger,drawer-profile-panel}.tsx`,
  `components/layout/site-footer/site-footer.tsx`, `components/layout/{public-widgets,back-to-top,scroll-to-top,viber-group-popup}.tsx`,
  `components/auth/user-menu.tsx`, `components/providers/index.tsx`, `contexts/inquiry-context.tsx`,
  `components/inquiry/inquiry-button.tsx`, `data/navigation.ts`, `constants/admin.ts` (`grantsBackOfficeAccess`).
- Checked before building: 18.11.2026 · Walked after building: 18.11.2026, on the production build at 390, 820, 1440
  and 1920 px: every row holds; no sideways scroll; `--header-h` measures 56 px (top bar) and 77 px (header).

## Header (desktop, from 1024 px)

| # | What the code does today | On the board | Outcome |
|---|---|---|---|
| 1 | Fixed at the top; hides after two frames of scrolling down past 120 px, comes back on any scroll up (`site-header.tsx:121-169`) | yes · `ac-hdr` note | — |
| 2 | A jump of more than 1000 px in one frame (the catalog's `?after=` restore) re-anchors without hiding; near the top it reveals (`:136-141`) | not drawn (behaviour) | Kept as is |
| 3 | Always visible again after the route changes (`:113-117`) | not drawn (behaviour) | Kept as is |
| 4 | Publishes its real height to `--header-h`, only when above 0; pages offset with `pt-(--header-h)` (`:57-81`) | not drawn (behaviour) | Kept, and extended to the new phone top bar |
| 5 | Logo links to `/`, alt „SelectAuto", no prefetch before first paint | yes · `ac-hdr` | — |
| 6 | Navigation from `NAV`: Автомобили, Внос ▾, Инструменти ▾, За нас ▾, Контакти; parents are links to their first page | yes · `ac-hdr` 1, 3–5 | — |
| 7 | Dropdowns open on hover only (`group-hover`) | opens on hover, keyboard focus and press · `ac-hdr` 3–4 | Improvement drawn on the board (README, interaction rules). A first tap on a touch screen opens the menu; the next follows the link |
| 8 | „Запитване" opens the inquiry quiz | yes, primary · `ac-hdr` | — |
| 9 | Signed out, or while the session loads: „Вход" → `/sign-in` | „Вход" signed out; a skeleton circle while loading · `ac-hdr` 1–2 | New loading state from the board (today „Вход" flashes for a signed-in user) |
| 10 | Signed in: the initial of the name, else of the e-mail, else „?" (`:36`) opens the account menu | yes · `ac-hdr` 6–7 | — |

## Account menu (`user-menu.tsx`)

| # | What the code does today | On the board | Outcome |
|---|---|---|---|
| 11 | Trigger: `aria-label="Профил"`, `aria-haspopup="menu"`, `aria-expanded`; closes on an outside press | yes · `ac-hdr` 7 | Also closes on Esc (new, keyboard) |
| 12 | Shows the name or „Профил", and the e-mail | yes · `ac-hdr` 8–10 | — |
| 13 | „Админ панел" → `/admin` only with back-office access (`grantsBackOfficeAccess`) | yes, orange row · `ac-hdr` 8–9 | — |
| 14 | „Любими автомобили" → `/lyubimi`; „Изход" signs out to `/` (client `signOut`) | yes · `ac-hdr` 7–10 | — |

## Phone and tablet (under 1024 px)

| # | What the code does today | On the board | Outcome |
|---|---|---|---|
| 15 | No top bar: the header is hidden; `--header-h` is 0 | a slim top bar with the logo, which hides and returns with the tabs · `kit-layout`, `ac-float` 2–3 | New from the board (README, layout). `--header-h` becomes the bar's height |
| 16 | Bottom tabs Начало · Автомобили · Carfax · Меню; active by path (home exact, others by prefix); hide with the header; safe-area padding; `aria-label="Основна навигация"` | yes · `ac-drawer` | — |
| 17 | Меню: animated hamburger; `aria-label` „Отвори менюто"/„Затвори менюто", `aria-expanded` | menu icon, orange while open; „Отворете менюто"/„Затворете менюто" · `ac-drawer` 1–2 | Formal address (decision 1); the board's icon replaces the hamburger animation. Since 18.11.2026 the button is named by its visible word „Меню" and `aria-expanded` gives the state: the label didn't contain the visible text (axe, WCAG 2.5.3 label in name; main had the same) |
| 18 | Drawer from the right, `min(88vw, 380px)`, over a dimmed page; tap outside closes; body scroll locked while open | yes · `ac-drawer` 2, `ac-drawer-tab` 1 | — |
| 19 | Drawer head „Меню" (capitals through CSS) and close „Затвори менюто" | „Меню" in sentence case, „Затворете менюто" · `ac-drawer` 2 | Sentence case and formal address (decision 10, 1) |
| 20 | Groups (Внос, Инструменти, За нас) expand in place with `aria-expanded`; their pages stay in the DOM | yes · `ac-drawer` 4 | — |
| 21 | The current page is marked (`aria-current="page"`), groups' sub-pages too | yes · `ac-drawer` 4–5 | — |
| 22 | Any link closes the drawer | not drawn (behaviour) | Kept |
| 23 | „Направете запитване" closes the drawer and opens the quiz | yes · `ac-drawer` 2 | — |
| 24 | Signed out: „Вход / Регистрация" → `/sign-in`; signed in: a „Моят профил" row with the initial and e-mail | yes, plus a skeleton while the session loads · `ac-drawer` 2, 3, 6 | New loading state from the board |
| 25 | Profile screen slides over the menu: back „Назад към менюто", „Моят профил" (capitals through CSS), identity, „Админ панел" with access, „Любими автомобили", „Изход" | yes · `ac-drawer` 7–8 | Sentence case |
| 26 | Closing the drawer returns the next opening to the menu, not the profile | not drawn (behaviour) | Kept |

## Footer

| # | What the code does today | On the board | Outcome |
|---|---|---|---|
| 27 | Logo → `/`; „Специализирани сме във внос…" | yes · footer partial | — |
| 28 | Phone and e-mail from `CONTACT`; Facebook, Instagram, TikTok, Viber from `SOCIALS`, new tab | yes | — |
| 29 | Навигация (`FOOTER_NAV`) and Информация (`FOOTER_INFO`) columns | yes | — |
| 30 | Бърз контакт: „Имаш въпрос за автомобил, доставка или аукцион?" and „Запитване" | „Имате въпрос…" | Formal address |
| 31 | „© 2026 SelectAuto. Всички права запазени." and the legal links (`FOOTER_LEGAL`, `aria-label="Правна информация"`) | yes | — |
| 32 | Company line from `BUSINESS`, only when its company id is set | yes | — |

## Floating widgets (not in /admin)

| # | What the code does today | On the board | Outcome |
|---|---|---|---|
| 33 | Viber group: appears after two scroll-down events past 320 px, hides on scroll up, ignores 1000 px jumps | yes · `ac-float` 1–3 | — |
| 34 | ✕ hides it until the tab is closed (`sessionStorage`); `inert` while hidden | yes · `ac-float` 4 | — |
| 35 | „Влез във Viber групата", „Получавайте първи най-добрите оферти", „6,500+ ентусиасти вече се присъединиха", „Влез" (new tab), close „Затвори" | „Влезте…", „Влезте", „Затворете"; a pill at the top on desktop, a card on phones · `ac-float`, `ac-float-desk` | Formal address |
| 36 | Back to top after 600 px, smooth (instant under reduced motion), „Обратно нагоре", above the tabs on phones | yes · `ac-float`, `ac-float-desk` | — |
| 37 | Notifications top right, 2,2 s | bottom right, left of „нагоре"; above the tabs on phones; ✕ to close; pause on hover and focus · `ac-float` 6–7, `ac-float-desk` 2–5 | Moved as drawn (README, interaction rules) |
| 38 | Inquiry opened before its code arrives: a dark backdrop that closes on press | backdrop plus a spinner · `ac-float` 5 | New loading state from the board |
| 39 | Inquiry code fails: „Формата не успя да се зареди. Моля опитайте отново." | yes · `ac-float` 6 | — |
