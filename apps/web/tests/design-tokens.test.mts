/**
 * Contrast of every text and ground pair in the design tokens, measured as
 * WCAG 2.2 defines it (relative luminance and contrast ratio):
 * - 4.5:1 for text (success criterion 1.4.3);
 * - 3:1 for control borders, focus rings and selection marks (1.4.11).
 *
 * The tokens are read from src/styles/tokens.css. Each pair says where the
 * board kit draws it. A tint such as `pos-w` is blended over the surface it
 * sits on, the way a browser composites a translucent colour.
 *
 * Every colour token must appear in a pair or on the DECORATIVE list, so a new
 * colour can't skip the check. Run with `pnpm --filter @selectauto/web test`.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, test } from "node:test";

type Rgba = [number, number, number, number];

type Pair = {
  /** Token name of the text, border or mark, or a key of LITERALS. */
  fg: string;
  /** Token name of the ground, or "<tint> over <surface>". */
  on: string;
  /** Where the kit draws this pair. */
  where: string;
};

const TOKENS_FILE = join(import.meta.dirname, "..", "src", "styles", "tokens.css");

/** Colours used by the kit that are Tailwind's own, not ours. */
const LITERALS: Record<string, string> = {};

/** Tokens that never carry or hold text and never mark a control on their own. */
const DECORATIVE: Record<string, string> = {
  black: "letterboxing behind a video and the drawers' backdrop (under its opacity); never text or a control's edge",
  hair: "dividers and card borders; never a control's only edge",
  hair2: "edges of popovers, dialogs and the bottom tab bar",
  scrim: "the dimmed page behind a dialog; the dialog's surface carries the text",
  "or-ring": "the glow around a focused field; the field's `or` border is the focus mark",
  paper: "the white tile behind the Google logo on /otzivi; no text on it",
};

const SURFACES = ["bg", "s1", "s2", "s3"];

const TEXT_PAIRS: Pair[] = [
  ...SURFACES.flatMap((on) =>
    ["tx", "tx2", "tx3", "ortx"].map((fg) => ({ fg, on, where: "text, secondary text, labels and links" })),
  ),
  ...["bg", "s1", "s2"].flatMap((on) =>
    ["pos", "warn", "neg", "info"].map((fg) => ({ fg, on, where: "status words, field errors, stat values" })),
  ),
  ...["bg", "s1", "s2"].map((on) => ({ fg: "vibertx", on, where: "the Viber glyph and the Viber popup's line" })),
  ...["bg", "s1", "s2"].flatMap((surface) =>
    [
      ["pos", "pos-w"],
      ["warn", "warn-w"],
      ["neg", "neg-w"],
      ["info", "info-w"],
      ["ortx", "or-w"],
    ].map(([fg, tint]) => ({ fg, on: `${tint} over ${surface}`, where: "tags and icon wells on their tint" })),
  ),
  ...["bg", "s1"].flatMap((surface) =>
    ["pos-w", "warn-w", "neg-w", "info-w"].flatMap((tint) =>
      ["tx", "tx2"].map((fg) => ({ fg, on: `${tint} over ${surface}`, where: "alert titles and alert text" })),
    ),
  ),
  { fg: "bg", on: "or", where: "the primary button" },
  { fg: "bg", on: "or-hi", where: "the primary button, hover" },
  { fg: "bg", on: "or-lo", where: "the primary button, pressed" },
  { fg: "bg", on: "gold", where: "the BUY NOW mark" },
  { fg: "bg", on: "pos", where: "the success button" },
  { fg: "bg", on: "tx", where: "a selected chip, segment or page number" },
  { fg: "white", on: "viber", where: "the Viber group button" },
  { fg: "ink", on: "plate", where: "a make's initials on its logo plate" },
];

const MARK_PAIRS: Pair[] = ["bg", "s1", "s2"].flatMap((on) => [
  { fg: "field", on, where: "borders of inputs, selects, chips and icon buttons" },
  { fg: "outl", on, where: "the secondary button's border" },
  { fg: "ortx", on, where: "the focus ring" },
  { fg: "or", on, where: "selected checkboxes and switches, the active tab line, a focused field's border" },
]);

function readColorTokens(css: string): Map<string, string> {
  const tokens = new Map<string, string>();
  for (const match of css.matchAll(/--color-([a-z0-9-]+)\s*:\s*([^;]+);/g)) {
    tokens.set(match[1], match[2].trim());
  }
  return tokens;
}

function parseColor(value: string): Rgba {
  const hex = /^#([0-9a-f]{6})$/i.exec(value);
  if (hex) {
    const n = Number.parseInt(hex[1], 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255, 1];
  }
  const rgba = /^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*(?:,\s*([\d.]+)\s*)?\)$/i.exec(value);
  if (rgba) {
    return [Number(rgba[1]), Number(rgba[2]), Number(rgba[3]), rgba[4] === undefined ? 1 : Number(rgba[4])];
  }
  throw new Error(`Unsupported colour "${value}". Write #rrggbb or rgba(r, g, b, a), or teach this test the syntax.`);
}

/** Source-over compositing of a translucent colour onto an opaque one, per channel in sRGB. */
function over(top: Rgba, under: Rgba): Rgba {
  const a = top[3];
  return [top[0] * a + under[0] * (1 - a), top[1] * a + under[1] * (1 - a), top[2] * a + under[2] * (1 - a), 1];
}

/** WCAG 2.2 relative luminance of an opaque sRGB colour. */
function luminance([r, g, b]: Rgba): number {
  const linear = (channel: number) => {
    const c = channel / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * linear(r) + 0.7152 * linear(g) + 0.0722 * linear(b);
}

/** WCAG 2.2 contrast ratio, from 1 to 21. */
function contrast(a: Rgba, b: Rgba): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

const tokens = readColorTokens(readFileSync(TOKENS_FILE, "utf8"));

function color(name: string): Rgba {
  const value = tokens.get(name) ?? LITERALS[name];
  if (value === undefined) throw new Error(`No colour token "${name}" in src/styles/tokens.css`);
  return parseColor(value);
}

/** The opaque ground a pair is measured on: a solid token, or a tint blended over a solid surface. */
function ground(spec: string): Rgba {
  const [top, under] = spec.split(" over ");
  const colour = color(top);
  if (under === undefined) {
    if (colour[3] !== 1) throw new Error(`"${top}" is translucent: name the surface it sits on ("${top} over s1")`);
    return colour;
  }
  const surface = color(under);
  if (surface[3] !== 1) throw new Error(`"${under}" must be an opaque surface`);
  return over(colour, surface);
}

function failures(pairs: Pair[], minimum: number): string[] {
  return pairs.flatMap(({ fg, on, where }) => {
    const back = ground(on);
    const front = color(fg);
    const ratio = contrast(front[3] === 1 ? front : over(front, back), back);
    return ratio >= minimum ? [] : [`${fg} on ${on}: ${ratio.toFixed(2)}:1, needs ${minimum}:1 (${where})`];
  });
}

describe("design tokens: contrast", () => {
  test("every colour token is #rrggbb or rgba()", () => {
    assert.ok(tokens.size > 0, "no --color-* tokens found in src/styles/tokens.css");
    for (const [name, value] of tokens) assert.doesNotThrow(() => parseColor(value), `--color-${name}`);
  });

  test("text reaches 4.5:1 on its ground", () => {
    assert.deepEqual(failures(TEXT_PAIRS, 4.5), []);
  });

  test("borders, focus rings and selection marks reach 3:1", () => {
    assert.deepEqual(failures(MARK_PAIRS, 3), []);
  });

  test("every colour token is in a pair or on the decorative list", () => {
    const used = new Set<string>();
    for (const { fg, on } of [...TEXT_PAIRS, ...MARK_PAIRS]) {
      used.add(fg);
      for (const name of on.split(" over ")) used.add(name);
    }
    const unchecked = [...tokens.keys()].filter((name) => !used.has(name) && !(name in DECORATIVE));
    assert.deepEqual(unchecked, [], "add a pair for each of these, or a reason on the DECORATIVE list");
    const stale = Object.keys(DECORATIVE).filter((name) => !tokens.has(name) || used.has(name));
    assert.deepEqual(stale, [], "the DECORATIVE list names tokens that are gone or that pairs already check");
  });
});
