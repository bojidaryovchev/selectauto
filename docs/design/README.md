# Design: „Нощно шосе"

SelectAuto's site and admin are being rebuilt in the „Нощно шосе" design, the direction the owner chose on
26 October 2026. This page holds the rules in words. The values live in code, and the pictures are the boards on the
design canvases.

- **The code binds.** `apps/web/src/styles/tokens.css` holds every colour, type style, radius and size. When a board
  disagrees with it, the code wins and the board is corrected.
- **The boards show every screen,** state, e-mail and document for desktop, tablet and phone: 553 boards.
- **Nothing ships until it matches today's product.** See [Parity first](#parity-first) below.

## Where things are

| What | Where |
|---|---|
| Tokens, fonts, type styles | `apps/web/src/styles/tokens.css`; fonts load in `apps/web/src/app/layout.tsx` |
| Component classes (`sa-btn`, `sa-car`, `sa-hdr` …) | `apps/web/src/styles/kit.css`, ported from the boards' kit; React components apply them |
| A screen's own layout classes (`cd-*` on the car page, `hm-*` on the make and model hubs, `im-*` on the import hubs and the calculators, `in-*` on the information pages, `ac-*` on the account pages and the inquiry dialog, `ad-*` in the admin) | `apps/web/src/styles/<screen>.css` (`car-page.css`, `hub-page.css`, `import-page.css`, the `info-*.css` files, `account.css`, `inquiry.css`, `admin.css`), ported from that screen's board sources by `apps/web/scripts/port-board-css.mjs`: token names, `cqi` → `vw`, container queries → media queries |
| Contrast test of every text and ground pair | `apps/web/tests/design-tokens.test.mts` (the site) and `email-colors.test.mts` (the e-mails), run by `pnpm test` |
| The formal-address check of every string, the blog included | `apps/web/tests/formal-register.test.mts`, run by `pnpm test` |
| The phone layout check: no sideways scroll, no button label that wraps, clips or loses its room, no field under 16 px | `apps/web/scripts/check-layout.mjs`: `pnpm --filter @selectauto/web check:layout -- --base <a running build>` (see its header) |
| The logo | `Logo` in `apps/web/src/components/common/logo.tsx` |
| Why this direction, these fonts, this logo | [adr-0001-direction-type-logo.md](adr-0001-direction-type-logo.md) |
| Which boards draw each screen | [boards.md](boards.md) |
| How to build one screen | the `selectauto-design` skill, [`.claude/skills/selectauto-design/SKILL.md`](../../.claude/skills/selectauto-design/SKILL.md) |
| Parity checks, one per rebuilt screen | [parity/](parity/README.md) |
| The board files, the kit they were drawn with, the helpers' reports | the design workspace, `D:/design/selectauto` on the owner's PC |
| The owner's decisions; the numbers on this page refer to them | `D:/design/selectauto/decisions.md` |
| Open questions, the rebuild plan and its progress | `D:/repos/selectauto/REDESIGN.md` (kept out of git) |

The canvases (main: the site, the account, e-mails and documents, 333 boards; admin: 220 boards), the design system
and the exploration of 26 October are claude.ai pages owned by the account that drew them; other accounts can only
view them. Their links are in `REDESIGN.md` and the workspace's `design.config.json`, not here: this repository is
public, and whether the main and admin canvases stay public is still open. Build from the local board files.

## Parity first

The owner's rule of 17 November 2026 (decision 26): every board is checked against today's code before its screen is
built, so the rebuild loses nothing.

1. **List what the screen does today,** from the code on `main`, read in full: every field, string, control, state
   (loading, empty, error, success, disabled, signed in and out, each admin role), entity variant, interaction,
   message, side effect (records written, e-mails sent, redirects), page metadata and structured data, accessible
   name, and per-device behaviour.
2. **Find each on the boards.** Anything missing or different is either an owner decision already recorded, or a board
   error.
3. **Fix a board error on the board first,** in the design workspace, then tell the owner what changed and why.
4. **Change behaviour only where it helps users or admins,** and only after the owner decides; record the decision in
   `decisions.md` before building it.
5. **Write the check down** in `docs/design/parity/<screen>.md`, and walk it again on the built screen.

## Owner decisions that shape every screen

The full list, with dates and wording, is `decisions.md`.

- **1 · Register:** formal „вие" everywhere. **2 · Logo:** kept exactly, only on dark grounds. **4 · Direction:** B
  „Нощно шосе".
- **5 · Catalog filters** stay above the results: a console on desktop, a sheet on phones, no sidebar.
- **6 · Every page, feature and state** exists for desktop, tablet and phone, and for every car type: Copart and IAAI
  auctions, Buy Now, Canada, Encar, sold, motorcycle.
- **7 · Car cards keep every field.** Buttons in a row share one height and alignment; secondary buttons are neutral.
- **8 · Car makes** always show their logo. The 3D particle car stays as the home hero.
- **10 · No regressions,** text included, compared case-sensitively. **11 · Emphasis capitals** („НЕ е оферта") keep
  their letters and may be bold.
- **13 · Car page:** the phone call stays the orange main action; the inquiry is secondary.
- **14–20, 22, 23:** approved product changes, each listed in `REDESIGN.md` with its file and line.
- **25 · Documents** (contracts, the deposit contract, notices, terms, policies) keep their wording.
- **26 · Parity first,** as above.

## Words

- **Every string keeps the code's exact characters.** Only these changes are allowed:
  - informal address becomes formal;
  - text the code upper-cases only through CSS becomes sentence case;
  - an arrow glyph becomes an icon;
  - the listed formats (decimal comma, readable admin dates and amounts);
  - new states and pages, whose strings the owner approves.
- **Formal „вие".** Imperatives end in -ете or -йте („Разгледайте", „Обадете се"). New interface text writes „вие, ви,
  вас" in lowercase; the capitalised forms are for e-mails and documents to one named person. A capital the code
  already has („Вас", „Ви") stays; lowering it is a later copy decision (21).
- **Sentence case.** No all-caps Cyrillic in the interface. Latin brand words keep their form: BUY NOW, COPART, IAAI,
  ENCAR, VIN, Carfax. The buy-now option is „Buy Now" on cards and in the catalog filter, and „Купи сега" as the car
  page's price label and in admin messages, as the code has it.
- **Documents and stored data are verbatim,** capitals included: names, vehicle descriptions, anything staff typed.
- **New copy only:** a button says what it does, verb plus object, on one line. An error says what happened and what to
  do next, in two short sentences, without blame or codes. A computed price says it is an estimate. No emoji.
- **Formats** (bg-BG):
  - car prices in USD, a no-break space between thousands, the sign after: „10 200 $"; four digits stay ungrouped:
    „3498 $";
  - euro-quoted fees in €; calculator totals in USD;
  - „155 316 km"; decimals with a comma: „2,5%";
  - dates and times in Sofia time as Intl writes them: „26.10.2026 г., 13:30";
  - admin money with two decimals: „23 875,00 USD"; never a database format on screen („2026-10-14", „1080.00");
  - countdown „1д 22ч 17м 2с", digits in mono, units in Manrope;
  - phone „+359 898 980 011"; VIN: 17 capital Latin letters and digits, always mono.

## Colour

| Token | Utility examples | Use |
|---|---|---|
| `bg` | `bg-bg` | Night: the ground of every page and band. The logo sits on it |
| `s1` · `s2` · `s3` | `bg-s1` | Surfaces stepping up in lightness: cards and panels; fields and strips; pressed and selected |
| `hair` · `hair2` | `border-hair` | Dividers and card borders; popover and dialog edges. Never a control's only edge |
| `field` · `outl` | `border-field` | Control borders; the secondary button's border |
| `tx` · `tx2` · `tx3` | `text-tx2` | Text; secondary text; labels and hints. Never pure white |
| `or` · `or-hi` · `or-lo` | `bg-or` | The one primary action of a view, its hover and pressed states; selection |
| `ortx` · `or-w` · `or-ring` | `text-ortx` | Links, active navigation, emphasis; the orange tint; a focused field's glow |
| `gold` | `bg-gold` | The logo and the BUY NOW mark, nothing else |
| `pos` · `warn` · `neg` · `info`, each with `-w` | `text-pos bg-pos-w` | Status, always with a word or an icon, on its tint |
| `viber` · `vibertx` | `bg-viber` | Viber group buttons; the Viber glyph |
| `plate` · `paper` · `ink` | `bg-plate text-ink` | The light plate behind make logos; the tile behind the Google logo; text on both |
| `scrim` | `bg-scrim` | Behind dialogs, sheets and the drawer |

- **Proportions 60 / 30 / 10:** night, then surfaces and text, then orange. Orange is never body text; links use `ortx`.
- **Elevation is lightness,** `bg` → `s1` → `s2` → `s3`. Only popovers, menus, dialogs and toasts cast `shadow-pop`.
- **Focus:** a 2 px `ortx` outline with a 2 px offset. On the chamfered primary button, an inset ring of `bg` then `tx`,
  because the chamfer clips an outline.
- **Contrast:** text 4.5:1 or more; borders, focus rings and selection marks 3:1. The test measures every pair the kit
  draws, with tints blended over their surface. The closest calls today are white on `viber` (4.82:1) and `tx3` on `s3`
  (4.83:1) for text, and `outl` on `s2` (3.75:1) for borders.

## Type

- **Families:** `font-display` is Unbounded (display, page and section titles, prices); `font-sans` is Manrope
  (everything else, and the default); `font-mono` is JetBrains Mono, for Latin letters and digits only (VIN, lot №,
  countdown digits).
- **`lang="bg"` stays on `<html>`.** It switches Unbounded and Manrope to the Bulgarian letterforms of д, л, ж, к and the
  rest; checked on 17 November 2026 against the font files the build ships. JetBrains Mono's Cyrillic has Russian forms
  only, which is why it never sets Bulgarian text.
- **Figures are tabular** (`font-variant-numeric: tabular-nums` on `body`), so prices and columns line up. Both fonts
  have them.
- **Type styles** are single utilities that set family, size, line height, weight and tracking, as the kit's classes do.
  Colour and measure stay separate.

| Utility | Size | Use |
|---|---|---|
| `type-display` | 40 → 92 px, Unbounded 700 | The home hero only |
| `type-h1` | 30 → 52 px, Unbounded 700 | Page title |
| `type-h2` | 24 → 38 px, Unbounded 600 | Section title |
| `type-h3` | 18 → 22 px, Manrope 800 | Panel and card-group titles |
| `type-h4` | 17 px, Manrope 700 | Small headings |
| `type-lead` | 17 → 20 px | Intro paragraphs, `tx2`, at most 62 characters a line (`max-w-[62ch]`) |
| `type-body` | 16 px, line 1.65 | Body copy, `tx2`, at most 68 characters a line |
| `type-small` | 14 px | Secondary copy, `tx2` |
| `type-label` | 13 px, 600 | Field and data labels, `tx3`; never all caps |
| `type-price` | 22 px, Unbounded 700 | Prices on cards; other prices take their size from their board |
| `type-button` · `-md` · `-sm` · `-xl` | 15 · 14 · 13 · 16 px, 800 | Button labels by button size |
| `type-code` | 14 px, mono 500 | VIN and lot № |

Sizes with an arrow grow with the window, as the boards' do (the kit's `cqi` became `vw`).

## Layout

- **Breakpoints:** phone below 640 px (no prefix), tablet 640–1023 px (`sm:`), desktop from 1024 px (`lg:`). Wide
  screens need no breakpoint: widths and grids are fluid. Tailwind's `md:`, `xl:` and `2xl:` are not design
  breakpoints.
- **Width:** content grows to `max-w-content` (1920 px) inside `px-gutter` (16 to 96 px); section backgrounds run edge
  to edge; sections are padded `py-band` (56 to 112 px).
- **Card grids** fill columns of at least 280 px: one at 390 px, two at 820, three at 1024, four at 1440, five at 1920,
  six at 2560. A big monitor shows more cars, never wider margins.
- **Spacing** uses 4 px steps, which are Tailwind's own scale: the design's 4, 8, 12, 16, 20, 24, 32, 40, 48, 64, 80 and
  112 are `1, 2, 3, 4, 5, 6, 8, 10, 12, 16, 20, 28`. Space inside a group is smaller than space between groups.
- **Small phones:** the boards are drawn at 390 px; the code also works down to 320. Under 420 px buttons and segments
  give up side padding first (`kit.css`, app-only rules); under 360 px a full-width or large button drops its icon, the
  rails show more of each card, the car page's bar takes two rows and a rail's arrows go under its title. A label still
  too long wraps only where the button carries `sa-btn--long`. Check with `check:layout` at 320 and 390.
- **Navigation:** on desktop, the header hides on scroll down and returns on scroll up. On phones and tablets, a slim top
  bar with the logo and the bottom tabs (Начало · Автомобили · Carfax · Меню) do the same.

## Shape and size

- **Radius:** `rounded-xs` 4 px small tags · `rounded-sm` 6 px badges · `rounded-md` 8 px buttons, icon buttons, inputs ·
  `rounded-lg` 12 px cards, panels, menus, tables · `rounded-xl` 16 px dialogs and sheets. These replace Tailwind's
  default values for the same names.
- **The chamfer** (`--chamfer`, 10 px; 12, 8 and 6 px by button size) cuts the primary button's top-left and
  bottom-right corners with a `clip-path`. Only the primary button and the BUY NOW mark (6 px) have it.
- **Control heights:** `h-control-lg` 48 px for default buttons and every input; `h-control-md` 44 px in cards and dense
  rows, the touch minimum; `h-control-sm` 36 px for dense admin controls; `h-control-xl` 56 px for hero calls to
  action. Controls side by side share one height.
- **Labels stay on one line,** never shortened with an ellipsis or a smaller font. On a phone, main actions are full
  width and stacked.
- **The logo:** `<Logo size="header" />` (48 px), `"bar"` (36 px, the phone and tablet top bar) or `"footer"` (72 px).
  Never below 32 px, never on orange or a light ground.

## Imagery, motion and icons

- **Car photos are data:** 3:2 on cards, 4:3 in the gallery. A missing photo is a calm grey field reading „Снимка при
  поискване". No stock images.
- **Make logos** sit on `bg-plate` in their own colours. A make without a logo shows its first two letters.
- **The 3D particle car** is the home hero and the only glow.
- **Motion** lasts 150–300 ms, ease-out. The countdown ticks every second and turns `ortx` under 24 hours. Spinners
  turn and skeletons shimmer (the boards draw them still). Sections fade in over 300 ms as they scroll into view.
  Under `prefers-reduced-motion` nothing moves, but every state still changes: the catalog's spinning globe becomes a
  still one, and sections are simply there.
- **Icons** are Lucide's drawings at stroke 1.8 and 20–24 px, beside a word, or with an `aria-label` when alone. Each is
  a component in `components/icons`, like the brand glyphs already there.

## Components and interaction

Components are named after their code files. The Components board (`kit-components`) shows every state, and the car
card board (`kit-cards`) shows every kind of card. Their styles are the kit's classes in `src/styles/kit.css`, ported
from the boards, so code and boards render alike: `Button` and `LinkButton` take `variant` (`pri`, `sec`, `ton`, `txt`,
`neg`, `pos`, `vb`), `size` (`sm`, `md`, `lg`, `xl`), `block` and `busy`; `IconButton` takes a required `label`.

- **Buttons** (`button.tsx`, `link-button.tsx`): primary (orange, chamfered, one per view), secondary (outline), tonal,
  text link, negative, positive, Viber. Sizes sm, md, default, xl. A busy button shows a spinner and a verb in -ане.
- **The car card** (`auction-card.tsx`) always shows all 11 fields (Търг №, Година, Пробег, Състояние, Щета, Цвят, Тип,
  Задвижване, Скоростна кутия, Продавач, Двигател; a missing value is „—"), the status or countdown strip, the source
  chip, the BUY NOW or „ПРОДАДЕН" mark, the favourite, the make plate, the price row and one action row at equal
  heights. Sold cards have one action, „Вижте активни обяви".
- **Fields:** the label above, never inside; 48 px; 16 px text so phones don't zoom; the error under the field as an icon
  and a sentence in `neg`. Forms use `noValidate`, so every message is the kit's, in Bulgarian and formal.
- **Bars** hide on scroll down and return on scroll up. A sticky action bar hides while what it jumps to is on screen.
  While the header and tabs are hidden, `<html>` carries `data-bars-hidden`, so a page's own bottom bar can follow the
  tabs to the screen's edge. While such a bar shows, it sets `--page-bar` to its height (globals.css), and the
  back-to-top button and the notifications sit above it.
- **Phone bars of the calculators and the import hubs** (`calc-bar.tsx`): fixed above the tabs, hidden while what they
  repeat is on screen (the summary; a hub's hero actions, calculator and closing call to action). A bar starts hidden
  and appears once it knows, so it never slides away at load. Heights, which `--page-bar` and the spacer after the
  footer repeat: 69 px with a 48 px button, 61 px for the budget's text-only bar (the car page's bar, with 44 px
  buttons, is 65 px).
- **The car page's action bar** (`car-action-bar.tsx`, phones and tablets): the price or the countdown, „Направете
  заявка" and the call („Обадете се"); a sold car's „Вижте активни обяви". It hides while the contact panel is on
  screen.
- **Toasts** sit bottom right on desktop and above the bottom tabs on a phone, close with ✕ and pause while hovered or
  focused. The admin keeps its inline feedback beside the control.
- **Dropdowns** (`combobox.tsx`, Base UI's Combobox): `look="kit"` gives the field and list of the boards (`ct-dd-*`),
  with a search field above 8 options, counts on the right, a tick on the chosen row and, with `plates`, make plates.
  Without it the old light look stays until each page that uses one is rebuilt. Base UI's state attributes
  (`data-popup-open`, `data-highlighted`, `data-selected`, `data-disabled`) map onto the kit's states in `kit.css`.
- **Make plates** (`make-plate.tsx`): the logo on a light plate, or two letters without one; sizes xs to xl. The car
  page passes the logo's alt („{марка} лого"); elsewhere it is the make's name.
- **Expandable panels** (`expandable-section.tsx`, the boards' `cd-exp`): a panel whose heading is a button with
  `aria-expanded`, the chevron orange and turned while open; the body animates its height and stays in the page while
  closed.
- **Section headings** (`section-heading.tsx`, the kit's `.sa-sh`): the orange eyebrow, the title and a lead on the
  left, actions on the right that drop under the text when there's no room. It replaces the old centred
  `SectionHeader` page by page.
- **Car rails** (`car-rail.tsx`): cards in a row with the next one peeking (1,15 on a phone up to 5,3 from 1800 px),
  autoplay every 2 s only while on screen, held while hovered, while focus is inside, and by the pause button
  „Спрете превъртането"; a 6 s pause after an arrow click, rewind at the ends, and the controls and „Вижте всички …" in
  the heading (on a phone, the controls beside the eyebrow and the link under the rail). Without an eyebrow (the car
  page's „Подобни автомобили") the title and the controls share one row, and `freeMode` lets the track glide.
- **Hubs** (`components/cars/hub/`): the header with the make's xl plate beside the H1, the model chips (a three-row
  swipe on a phone), the empty panel, the FAQ (two columns when there's no sold-price table) and the skeleton.
- **Import hubs** (`components/hubs/`): the hero with the market's flag and the reasons panel, article bands, pairs and
  rows of cards with icon tiles (state colours for the US title types), the numbered process, the closing band with
  the market chips and the call to action, and the phone bar. Their rail (`car-scroll-rail.tsx`) scrolls and snaps,
  4 / 3 / 2 / 1,16 cards (5 and 6 on wide screens), its arrows move one card and are disabled at the ends, and it
  doesn't move on its own: the hubs' listings were a still grid.
- **FAQ accordion** (`faq-accordion.tsx`, `.im-faq`): the import hubs and the calculators; the first answer open, every
  answer kept in the page so the FAQPage JSON-LD still matches.
- **Links in running text** (globals.css): orange (`ortx`) and underlined, the boards' kit rule for any link. It
  applies to classless links in a paragraph of a rebuilt section (`.sa-wrap`), since every other link there is a
  component or carries utilities.
- **The catalog's filters** sit in one console above the results on tablets and desktops, and in a full-height sheet on
  phones, behind „Филтри" (decision 5). They apply as they change; the tab Активни / Приключили is not a filter.
- **Carousels** keep advancing on their own, pause on hover and focus, and have a pause button („Спрете превъртането").
  The import hubs' rails don't move on their own, so they have none.
- The rest of the interaction rules are on the boards of each screen; [boards.md](boards.md) finds them.

## Accessibility

- Real `button`, `a`, `label` and `input` elements. Icon-only controls carry an `aria-label`; decorative SVGs carry
  `aria-hidden`.
- Never remove a focus style. Targets are 44 px or more. Images carry the car's title as `alt`, and the countdown has a
  text equivalent.

## While the rebuild runs

- **The old light theme's tokens** stay in `apps/web/src/app/globals.css`, marked legacy, until no page uses them. When
  the last one goes, consider setting `--color-*: initial` in the tokens so a colour outside the design can't be used.
- **The shell is rebuilt** (17–18 November): the page ground is night, the header, phone top bar, bottom tabs, drawer,
  footer, Viber popup, back-to-top and notifications follow their boards, and the focus ring and the dark colour scheme
  are global. Pages not rebuilt yet look broken on the dark ground until their turn.
- **Rebuilt so far:** the car card and the confirm dialog, the catalog (`/vsichki-avtomobili`), the home page, the car
  page (`/avtomobil/[id]`) with its gallery, full-screen photo viewer, media dialogs and action bar, the make and
  model hubs (`/avtomobili/marka/…`), the import calculator (`/kalkulator`, its e-mail form and the car page's
  calculator dialog), the leasing and budget calculators, the import hubs (`/vnos-na-koli-ot-…`), the FAQ, contacts,
  about and reviews pages, the Carfax and VIN check pages with the Carfax dialog, /proces, the blog, the three
  legal pages, the 404, 410 and error pages, the sign-in and account pages (`/sign-in` to `/greshka-pri-vhod`) and
  the favourites (`/lyubimi`), the inquiry dialog, the admin's shell (sidebar, phone top bar and drawer, account
  card), dashboard, loading, error and 404 states and shared parts (`components/admin/ui`), the three lead inboxes
  (Carfax, consultations, offers) with their drawer, the mail (Поща and the thread page), the contracts register,
  the deposits page, the contract form, the contract page, the hidden listings, mobile.bg, the tariffs, the recipients,
  the users and the journal, and the seven e-mails. Each has its parity file in [parity/](parity/README.md).
- **The ab- boards' styles** (deals, listings, settings) are `styles/admin-b.css`, ported with their named container
  queries (`ablist`, `abform` …), which are the code's own approach. The few rules the boards scope under their root
  `.ab` are written by hand in `styles/admin-b-root.css`. Fields stay the admin's 44 px, 16 px `ad-in`, not the boards'
  15 px `ab-f`.
- **Never open a real mail thread to check it** (`/admin/poshta/[id]`): its render fetches missing message bodies from
  Resend and saves them. Check the thread components on a temporary route with made-up threads, and delete it.
- **Make plates in the admin** come from `getMakeLogoLookup` (`lib/admin-lead-view.ts`): leads store the make as text,
  so it is matched by name against the makes the car cards use, then against the inquiry quiz's own logos.
- **Admin pages not rebuilt yet** already get the kit's buttons, panels, fields, chips, pager and banners through the
  shared parts, but keep their own light classes until their turn, so they look half-dark until then.
- **The fonts are defined once,** in `src/styles/fonts.ts`: the root layout and `app/global-error.tsx`, which replaces
  the layout, both load them from there.
- **The 410 page is a document the proxy sends,** `src/lib/gone-page.ts`, not a route: it can't use the components,
  the stylesheet or the fonts, so its look is written out there. Keep it in step with the tokens and the kit.
- **Montserrat is gone** (with /proces, 18 November): the particle title is drawn in Unbounded, and the e-mails name
  Manrope first in their font stack (`emails/theme.ts`), loading no web font.
- **The e-mails compile with react-email's own Tailwind** (`emails/theme.ts`), not the site's, and ESLint and Prettier
  read that theme through `emails/tailwind.css`. Four rules keep them working in mail clients:
  - every size is px, from `pixelBasedPreset`'s steps or an arbitrary value (`w-[132px]`), because several clients
    ignore rem; any other step (`w-33`, `px-4.5`) compiles to rem;
  - no `var()`: Gmail drops the declaration, so a shadow is an arbitrary property (`[box-shadow:…]`), not `shadow-[…]`;
  - a block whose padding changes on a phone is a `Row`/`Column` cell, never a `Section` or the `Body`: react-email
    moves their padding onto an inner cell and leaves the class outside, so `max-[480px]:` padding never applies;
  - a `Column` is a bare cell with no `border="0"`, so a border goes on its `Row`; `border-solid` on a cell gives its
    other three sides the default 3 px.

  Check a change by rendering every template with `render()` from `react-email` (what Resend calls) and looking at it
  at 700, 390 and 320 px; the walk is in [parity/emails.md](parity/emails.md).
- **Fonts:** four font files are preloaded (Manrope and Unbounded, Latin and Cyrillic). Measure LCP on a phone.
- **Where the design system's `tokens.json` and the kit differ, the code follows the kit,** because the boards were
  drawn with it: `small` sets no weight (tokens.json says 500); prices and button labels have the kit's tracking; `or-ring`
  and `paper` exist only in the kit. Correct `tokens.json` when the design system is next published.
