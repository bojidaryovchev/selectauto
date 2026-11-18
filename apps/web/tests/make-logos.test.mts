/**
 * The make logos (`src/data/make-logos.ts`, files in `public/brand-logos`; sources in `docs/make-logos.md`):
 *
 * - every listed file exists, and every file in the folder is listed;
 * - no make both has a logo and is listed without one;
 * - every SVG is inert: the site serves these from its own origin, so one opened on its own must not run anything or
 *   pull anything in (no scripts, event handlers, `foreignObject` or links outside the file);
 * - every raster is the PNG or WebP it says it is, at most 256 px on its long side, and every file at most 40 KB;
 * - no logo is taller than wide (the plate is a grid whose row grows with a tall image, so it would overflow);
 * - the inquiry quiz's own list (`src/data/inquiry-brands.ts`) points at the same files.
 *
 * Run with `pnpm --filter @selectauto/web test`.
 */
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { describe, test } from "node:test";
import { fileURLToPath } from "node:url";

// Computed specifiers: Node strips the types when it loads the files, and TypeScript doesn't ask for `.ts` imports.
const { MAKE_LOGOS, MAKES_WITHOUT_LOGO } = await import(new URL("../src/data/make-logos.ts", import.meta.url).href);
const { INQUIRY_BRAND_LOGOS } = await import(new URL("../src/data/inquiry-brands.ts", import.meta.url).href);

const DIR = fileURLToPath(new URL("../public/brand-logos/", import.meta.url));
const LOGOS = MAKE_LOGOS as Record<number, string>;
const WITHOUT = MAKES_WITHOUT_LOGO as Record<number, string>;
const MAX_BYTES = 40 * 1024;
const MAX_SIDE = 256;

/** The quiz's labels and their `manufacturers.external_id`. */
const QUIZ_MAKES: Record<string, number> = {
  BMW: 16, Audi: 9, Mercedes: 88, Toyota: 140, Honda: 56, Ford: 48, Volkswagen: 147, Nissan: 99, Mazda: 85,
  Hyundai: 58, KIA: 70, Lexus: 76, Subaru: 132, Tesla: 187, Porsche: 110, Jeep: 68,
};

/** Width and height of a PNG or WebP, read from its header. */
function rasterSize(file: string, bytes: Buffer): [number, number] {
  if (file.endsWith(".png")) {
    assert.equal(bytes.subarray(1, 4).toString("latin1"), "PNG", `${file} is not a PNG`);
    return [bytes.readUInt32BE(16), bytes.readUInt32BE(20)];
  }
  assert.ok(file.endsWith(".webp"), `${file}: logos are SVG, PNG or WebP`);
  assert.equal(bytes.subarray(0, 4).toString("latin1"), "RIFF", `${file} is not a WebP`);
  assert.equal(bytes.subarray(8, 12).toString("latin1"), "WEBP", `${file} is not a WebP`);
  const chunk = bytes.subarray(12, 16).toString("latin1");
  if (chunk === "VP8X") return [1 + bytes.readUIntLE(24, 3), 1 + bytes.readUIntLE(27, 3)];
  if (chunk === "VP8L") {
    const v = bytes.readUInt32LE(21);
    return [(v & 0x3fff) + 1, ((v >> 14) & 0x3fff) + 1];
  }
  assert.equal(chunk, "VP8 ", `${file}: unknown WebP chunk ${chunk}`);
  return [bytes.readUInt16LE(26) & 0x3fff, bytes.readUInt16LE(28) & 0x3fff];
}

describe("make logos", () => {
  const files = readdirSync(DIR);
  const listed = Object.values(LOGOS);

  test("every listed file exists, every file is listed, each once", () => {
    for (const f of listed) assert.ok(files.includes(f), `public/brand-logos/${f} is missing`);
    for (const f of files) assert.ok(listed.includes(f), `public/brand-logos/${f} is in no make's entry`);
    assert.equal(new Set(listed).size, listed.length, "two makes share a file");
  });

  test("no make both has a logo and is listed without one", () => {
    for (const id of Object.keys(WITHOUT)) assert.ok(!(id in LOGOS), `make ${id} is in both lists`);
    for (const [id, why] of Object.entries(WITHOUT)) assert.ok(why.trim().length > 0, `make ${id} has no reason`);
  });

  for (const f of files) {
    test(f, () => {
      const bytes = readFileSync(DIR + f);
      assert.ok(bytes.length <= MAX_BYTES, `${f} is ${Math.round(bytes.length / 1024)} KB, over 40`);
      if (f.endsWith(".svg")) {
        const svg = bytes.toString("utf8");
        assert.ok(!/<script|<foreignObject|<iframe|<embed|<object|<!ENTITY|<!DOCTYPE/i.test(svg), `${f} has active content`);
        assert.ok(!/\son[a-z]+\s*=/i.test(svg), `${f} has an event handler`);
        assert.ok(!/javascript:/i.test(svg), `${f} has a javascript: URL`);
        for (const [, href] of svg.matchAll(/\shref\s*=\s*"([^"]*)"/gi)) {
          assert.ok(href.startsWith("#") || /^data:image\/(png|jpe?g|webp|gif);/i.test(href), `${f} links to ${href.slice(0, 60)}`);
        }
        assert.ok(!/url\(\s*['"]?(https?:|\/\/)/i.test(svg), `${f} pulls in a remote URL`);
        const vb = /viewBox="([^"]+)"/.exec(svg);
        assert.ok(vb, `${f} has no viewBox`);
        const [, , w, h] = vb[1].trim().split(/[\s,]+/).map(Number);
        assert.ok(w >= h - 1e-6, `${f} is taller than wide (${w}×${h})`);
      } else {
        const [w, h] = rasterSize(f, bytes);
        assert.ok(Math.max(w, h) <= MAX_SIDE, `${f} is ${w}×${h}, over ${MAX_SIDE} px`);
        assert.ok(w >= h, `${f} is taller than wide (${w}×${h})`);
      }
    });
  }

  test("the inquiry quiz shows the same files", () => {
    const quiz = INQUIRY_BRAND_LOGOS as Record<string, string>;
    assert.deepEqual(Object.keys(quiz).sort(), Object.keys(QUIZ_MAKES).sort());
    for (const [label, id] of Object.entries(QUIZ_MAKES)) {
      assert.equal(quiz[label], `/brand-logos/${LOGOS[id]}`, `the quiz's ${label} logo differs from make ${id}'s`);
    }
  });
});
