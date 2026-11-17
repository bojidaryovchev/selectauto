# ADR 0001: The „Нощно шосе" direction, its type, and the kept logo

- **Status:** accepted. The direction and the logo were decided on 26 October 2026, and the record was written on
  17 November 2026, when the rebuild started.
- **Decided by:** the owner (`decisions.md` 2 and 4).

## Context

- **The site before the redesign:**
  - a light interface set in Montserrat;
  - on desktop, an orange gradient header with the gold and white logo on it;
  - content in a centred column of at most 1280 px, so a wide monitor showed a small page in a sea of margin. That was
    the complaint that started the redesign.
- **The owner's terms:** the whole site and admin, every page and state on every device, and nothing lost, text
  included.
- **Three directions** were drawn on 26 October 2026 with the product's own content. Each had a style tile, the home
  page at 1920 px, the catalog, and the calculator on a phone:
  - **A „Табло":** precise, light, built around numbers. Claude recommended it.
  - **B „Нощно шосе":** dark, dynamic, motorsport.
  - **C „Шоурум":** calm, editorial, led by photos.

## Decision

1. **Direction B „Нощно шосе",** chosen by the owner for how its buttons and its text look:
   - dark grounds that step up in lightness instead of casting shadows;
   - orange only for the one primary action of a view and for selection, on a primary button with chamfered corners;
   - gold only for the logo and the BUY NOW mark.

   The recommendation had been A. The owner looked at all three and chose B. From then on, every board and every rule
   follows B.
2. **The type that came with B:**
   - **Unbounded** for display, page and section titles, and prices. It is wide and heavy, so titles and prices read at
     a glance on a dark ground.
   - **Manrope** for every other piece of interface text. It sets narrower than Montserrat, so labels fit their
     controls.
   - Both draw the Bulgarian letterforms under `lang="bg"`, and both have tabular figures. These were checked on
     17 November 2026, against the font files the build ships.
   - **JetBrains Mono** for VIN, lot numbers and countdown digits. Its Cyrillic letters have only Russian forms, so it
     sets Latin letters and digits only.
3. **The logo is kept exactly** (gold and white), and only on dark grounds. Gold on the old orange header measures
   2.0:1, so the header's ground changes, not the logo. Its sizes are 48 px in the header, 36 px in the phone top bar and
   72 px in the footer, and never under 32 px, where the lettering stops reading.

## Consequences

- **The whole interface becomes dark.** Every text and ground pair is measured by `apps/web/tests/design-tokens.test.mts`,
  so a colour change that breaks contrast fails `pnpm test` and `pnpm check`.
- **The browser's colour scheme turns dark** (the viewport's `colorScheme` and the theme colour `#0C0D10`) when the
  shell is rebuilt. Until then, the legacy light pages keep the light scheme.
- **Montserrat leaves.** It stays only for the /proces particle title until that page is rebuilt.
- **More font files load.** Manrope and Unbounded, each in Latin and Cyrillic, make four preloaded files, where the old
  site had two. The rebuild measures LCP on a phone and drops a preload if it costs.
- **E-mails and PDFs keep their own font handling.** E-mail clients seldom load web fonts, and the PDFs embed theirs.
  How each one looks follows its board, in the e-mails and documents step.
- **The boards were drawn with container queries** (`cqi`). The code uses `vw` and the `sm:` and `lg:` breakpoints, which
  give the same sizes at the boards' widths.
- **Tailwind's radius scale now carries the design's values,** so `rounded-md` is 8 px and `rounded-lg` 12 px.
- **The code binds from now on.** When a board disagrees with `apps/web/src/styles/tokens.css`, the code wins, and the
  board is corrected.
