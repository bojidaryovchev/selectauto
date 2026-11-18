/**
 * Contrast of every text and ground pair in the e-mails' palette (`src/emails/theme.ts`), measured as WCAG 2.2
 * defines it: 4.5:1 for text (success criterion 1.4.3). The e-mails have their own light palette of fixed hex values,
 * which react-email inlines, so tests/design-tokens.test.mts (the site's tokens) doesn't see it.
 *
 * Every colour must appear in a pair or on the DECORATIVE list, so a new colour can't skip the check. Run with
 * `pnpm --filter @selectauto/web test`; its script turns off the one warning Node gives when it loads `theme.ts` (the
 * package declares no module type).
 */
import assert from "node:assert/strict";
import { describe, test } from "node:test";

type Rgb = [number, number, number];

type Pair = {
  /** Colour name of the text. */
  fg: string;
  /** Colour name of the ground it sits on. */
  on: string;
  /** Where the e-mails draw this pair. */
  where: string;
};

// A computed specifier: Node strips the types when it loads the file, and TypeScript doesn't ask for `.ts` imports.
const themeUrl = new URL("../src/emails/theme.ts", import.meta.url).href;
const { emailTailwindConfig } = await import(themeUrl);
const COLORS: Record<string, string> = emailTailwindConfig.theme.extend.colors;

/** Tailwind's own colours that the e-mails use. */
const LITERALS: Record<string, string> = { white: "#FFFFFF" };

/** Colours that never carry or hold text. */
const DECORATIVE: Record<string, string> = {
  line: "rules between rows, above the footer and around the cards",
  "line-dash": "the dashed rule under a line outside the total",
  desk: "the page around the card; no text sits on it",
  photo: "behind a car photo while it loads",
};

const PAIRS: Pair[] = [
  { fg: "ink", on: "white", where: "titles, values and the team e-mails' total" },
  { fg: "ink", on: "panel", where: "the calculator total, the VIN" },
  { fg: "ink", on: "foot", where: "„SelectAuto“ in the footer" },
  { fg: "body", on: "white", where: "paragraphs and the signature" },
  { fg: "muted", on: "white", where: "row labels, notes, the breakdown labels" },
  { fg: "muted", on: "panel", where: "„VIN номер“" },
  { fg: "muted", on: "foot", where: "the footer's contacts and copyright" },
  { fg: "faint", on: "white", where: "a line outside the total in the calculator e-mail" },
  { fg: "ortx", on: "white", where: "links and the eyebrow" },
  { fg: "ortx", on: "foot", where: "the footer's social links" },
  { fg: "night", on: "orange", where: "the button" },
];

function color(name: string): Rgb {
  const value = COLORS[name] ?? LITERALS[name];
  if (value === undefined) throw new Error(`No colour "${name}" in src/emails/theme.ts`);
  const hex = /^#([0-9a-f]{6})$/i.exec(value);
  if (!hex) throw new Error(`"${name}" is "${value}": write e-mail colours as #rrggbb`);
  const n = Number.parseInt(hex[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** WCAG 2.2 relative luminance of an sRGB colour. */
function luminance([r, g, b]: Rgb): number {
  const linear = (channel: number) => {
    const c = channel / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * linear(r) + 0.7152 * linear(g) + 0.0722 * linear(b);
}

/** WCAG 2.2 contrast ratio, from 1 to 21. */
function contrast(a: Rgb, b: Rgb): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

describe("e-mail colours: contrast", () => {
  test("every e-mail colour is #rrggbb", () => {
    for (const name of Object.keys(COLORS)) color(name);
  });

  test("text reaches 4.5:1 on its ground", () => {
    const low = PAIRS.flatMap(({ fg, on, where }) => {
      const ratio = contrast(color(fg), color(on));
      return ratio < 4.5 ? [`${fg} on ${on}: ${ratio.toFixed(2)}:1 (${where})`] : [];
    });
    assert.deepEqual(low, []);
  });

  test("every e-mail colour is in a pair or on the decorative list", () => {
    const used = new Set(PAIRS.flatMap(({ fg, on }) => [fg, on]));
    const unchecked = Object.keys(COLORS).filter((name) => !used.has(name) && !(name in DECORATIVE));
    assert.deepEqual(unchecked, []);
  });
});
