---
name: selectauto-design
description: Build or restyle one SelectAuto screen (a page, state, dialog, e-mail or document in apps/web) in the „Нощно шосе" design from its boards, after checking the boards against today's code for full parity. Use for any change to what a SelectAuto user or admin sees.
when_to_use: The redesign rebuild of a route or component, a board-versus-code parity check, restyling a component with the design tokens, or a question about the design's colours, type, sizes or copy rules.
argument-hint: "<route, component or screen>"
---

# Build one SelectAuto screen from its boards

The design is finished and drawn: 553 boards for desktop, tablet and phone. The code binds: `apps/web/src/styles/tokens.css`
holds the values, and `docs/design/README.md` holds the rules. This skill builds one screen at a time, and never loses
anything the screen does today.

Work in the rebuild's worktree, `D:/repos/selectauto-redesign`, on branch `feat/redesign`.

## 1. Inputs

- The route or component: $ARGUMENTS
- Its boards: find its rows in `docs/design/boards.md`. A page source gives `<id>.dc.html` (desktop),
  `<id>-t.dc.html` (tablet) and `<id>-p.dc.html` (phone); flow boards hold several frames of one interaction. Take every
  row for the screen, states and flows included.
- Its audience: public, signed in, or an admin role (admin, observer, supervisor).

## 2. Read, in full

1. `docs/design/README.md`, then `D:/design/selectauto/decisions.md`, then the open points in
   `D:/repos/selectauto/REDESIGN.md`.
2. **Today's code on `main`**: the page, every component it renders, its data, constants, queries, server actions and
   e-mails. Read it with `git show main:<path>`, because this branch may already have changed a shared file.
3. **What changed since the boards were drawn.** The boards match `main` at `2c0aeed` (2 November 2026). Run
   `git log --oneline 2c0aeed..main -- <the screen's files>`. Every change listed there is a feature the boards may lack.
4. **The boards**, from the local files in `D:/design/selectauto`. Never use claude.ai for them: the canvases belong to
   another account. Read the source `src/<id>.html` for words and structure. To see a board, run
   `dcanvas shot <id>.dc.html --slice 1400` in `D:/design/selectauto`, then read the PNGs in `shots/`. 58 images went
   missing from the workspace, so some boards show a broken car photo or make logo; judge the layout, not the gap.
5. The components the screen will use: `apps/web/src/components/common/index.ts` and the feature folder. Reuse before
   writing anything new.

## 3. Parity check, before any code

This step is the owner's rule (decision 26). Write `docs/design/parity/<screen>.md` in the format of
`docs/design/parity/README.md`.

1. **List everything the code does,** with file and line: every field, string (case-sensitive), control, state (loading,
   empty, error, success, disabled, signed in and out, each role), entity variant (every car type), interaction,
   message, side effect (records written, e-mails sent, redirects, cache tags), metadata and structured data,
   accessible name, and per-device behaviour.
2. **Find each item on the boards.** For the strings, `dcanvas regress --out <file.md>` in the workspace compares every
   string in the code with the boards. It reads the main checkout, `D:/repos/selectauto`: first check that its `apps/web`
   matches `main` with `git -C D:/repos/selectauto diff --quiet main -- apps/web`.
3. **Settle every difference before building:**
   - **The board is wrong or incomplete:** fix the board first. Edit `src/<id>.html`, then run `dcanvas build <id>`,
     `dcanvas check --src <id> --shots` and `dcanvas copyscan`, and look at the shots. Draw a missing state or screen
     the same way; use the `design-canvas` skill for anything larger. Tell the owner what changed on the board and why.
     The parity file records the fix; the canvases are published again later, with all fixes at once.
   - **The board changes behaviour on purpose:** build it only if `decisions.md` records the owner's decision. Otherwise
     ask the owner, with a recommendation. Propose a functional change only when it helps users or admins work, and
     say how.
   - **Nothing missing:** go on.

## 4. Build

- **Tokens and components only.** No hex colours, no arbitrary pixel sizes where a token exists, no fonts but the three
  families. Type comes from the `type-*` utilities.
- **E-mails are the exception.** They compile with react-email's own Tailwind and the e-mail palette in
  `emails/theme.ts`, in px. Follow the four e-mail rules in `docs/design/README.md` (px only, no `var()`, phone padding
  on `Row`/`Column` cells, borders on the `Row`) and render every template to check a change.
- **The real data and words come from the code, never from a board.** Boards mask people („Иван П.", „+359 88• ••• •34")
  and use sample cars. The product shows what the code shows. The admin shows full names, phones and e-mails, because
  staff call and reply.
- **Rules that are easy to break:**
  - **One orange action per view.** Links use `ortx`; gold is only for the logo and the BUY NOW mark; status colours
    always come with a word or an icon.
  - **Text keeps the code's exact characters.** Only the allowed changes apply: formal address, sentence case where
    the code upper-cases through CSS, arrows as icons, the listed formats, and approved new strings.
  - **Formal „вие"** in new strings, with lowercase pronouns in the interface.
  - **Formats:** „10 200 $", „3498 $", „155 316 km", „2,5%", „26.10.2026 г., 13:30", admin money „23 875,00 USD",
    VIN and lot № in mono.
  - **Targets are 44 px or more.** Controls in a row share one height; secondary buttons are neutral.
  - **Labels stay on one line,** with no ellipsis and no smaller font. On a phone, main actions are full width.
  - **The car card keeps all 11 fields.** On the car page, the phone call is the main action.
  - **The logo sits on dark grounds only,** through `<Logo>`.
  - **Breakpoints:** no prefix for phones, `sm:` for tablets, `lg:` for desktops. Content stays within
    `max-w-content` and `px-gutter`, and card grids fill columns of at least 280 px.
- **Keep every behaviour on the parity list.** Restyle the markup, not the logic, unless a decision says otherwise.

## 5. Look

- **The local app talks to the live database and the real e-mail service.** Copy the root `.env` into the worktree if
  it is missing. Run `pnpm --filter @selectauto/web build`, then `next start` on a free port; another project may hold
  3100.
- **Read only.** Drive the app with Playwright and abort every request that isn't a GET. Never submit a real form; mock
  the request under test instead. Never open `/admin/poshta/[id]`, which writes when viewed.
- **Compare with the board:** screenshot the screen at 390, 820, 1440 and 1920 px, and compare each with the board's
  PNG. Fix what differs: spacing, alignment, sizes, wrapping, clipped text.
- **Check there is no sideways scroll** and no wrapped button at 320 and 390 px: run `pnpm --filter @selectauto/web
  check:layout -- --base <the build> --only <the screen's paths>` (add `--admin` with `SA_SESSION` for admin screens).
  It emulates a phone; a desktop browser's own scrollbar would take 15 px off the width and mislead the check.
- **Compare with the live site** at the same widths. Every string and state of the parity list must still be there.

## 6. Verify

- Walk the parity file against the built screen, and tick every row.
- Run `pnpm check` at the repository root: type-check, lint and the contrast test. Then make a production build.
- Report to the owner: what was built, the boards it follows, every board fix, every open question with a
  recommendation, and the screenshots that show it.

## 7. A new pattern

When the screen needs something the components don't have:
- add a component, named as on the Components board (`kit-components`), with every word a prop;
- add a line about it to `docs/design/README.md`;
- add a drawing of it to the Components board in the workspace.

When a board and the tokens disagree, the tokens win: correct the board, and note the fix in `REDESIGN.md`.
