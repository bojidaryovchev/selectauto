import { JetBrains_Mono, Manrope, Unbounded } from "next/font/google";

/*
  The „Нощно шосе" type (docs/design/README.md), loaded once here and imported by the root layout and by
  app/global-error.tsx, which replaces the layout and so brings its own fonts. Next hosts each font loader call as its
  own instance, so the loaders live in one module (next/font docs, „Using a font definitions file").

  All three are variable fonts, so every weight comes from one file per subset. Their CSS variables feed font-sans,
  font-display and font-mono in src/styles/tokens.css.
*/

// Manrope: all interface text.
export const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin", "cyrillic"],
  display: "swap",
});

// Unbounded: display, page and section titles, and prices.
export const unbounded = Unbounded({
  variable: "--font-unbounded",
  subsets: ["latin", "cyrillic"],
  display: "swap",
});

// JetBrains Mono: VIN, lot № and countdown digits only. Its Cyrillic letters have no Bulgarian forms, so only the Latin
// subset is loaded, and it is not preloaded because it only sets short codes.
export const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  display: "swap",
  preload: false,
});

/** The three fonts' CSS variables, for the `<html>` element's class. */
export const FONT_VARIABLES = `${manrope.variable} ${unbounded.variable} ${jetbrainsMono.variable}`;
