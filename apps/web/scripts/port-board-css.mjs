// Ports a screen's own board CSS into an app stylesheet (apps/web/src/styles/<screen>.css), as kit.css was ported from
// the boards' kit: the <style> blocks of the screen's board sources are read, token variables renamed to tokens.css
// names, cqi → vw, @container sa → @media. Rules are deduplicated across sources (in first-seen order) and kept only
// when every selector starts with the screen's prefix; rules matching the drop pattern (board-only frames, overlays,
// and parts the app builds with its own components) are left out.
//
// The board sources are the design workspace's `src/<prefix>*.html` (D:/design/selectauto on the owner's PC).
//
// Usage: node apps/web/scripts/port-board-css.mjs <prefix> <out.css> <drop-regex> <title> <src.html> [<src.html> …]
//
// The car page (styles/car-page.css), run from the workspace's src folder; afterwards `.cd-buy`'s `top` was changed by
// hand from the boards' 96px to `calc(var(--header-h) + 20px)`, so it follows the real header:
//
//   node <repo>/apps/web/scripts/port-board-css.mjs cd- <repo>/apps/web/src/styles/car-page.css \
//     'cd-(fr|vp|dpos|snip|og|lbcap|lbcl|bar--abs|fs\b|fs__|mmd|spec__|st\b|sts|lb--ph|est|res\b|res__|locked|q\b|q__|qban|qopt|qstart|qt\b|vw|hint|galmain|gal\b|mm\b|mm__|lb\b|lb__|noimg|mstrip|zoom|ovl|sheet|auth|cursor|dcol|dlg|focus|or\b|pin\b|scr\b|swipe|tap|toastpos|w520)' \
//     "The car page's layout and panels (boards cd-*): …" \
//     cd-copart.html cd-iaai.html cd-buynow.html cd-buynow-iaai.html cd-canada.html cd-korea.html cd-korea-insp.html \
//     cd-korea-full.html cd-sold.html cd-sold-noprice.html cd-unsold.html cd-sold-kr.html cd-moto.html cd-loading.html \
//     cd-states.html cd-f-bar.html cd-f-sticky.html cd-f-vin.html
import fs from "node:fs";

const [prefix, out, dropPattern, title, ...sources] = process.argv.slice(2);
const drop = new RegExp(dropPattern);

const colors = [
  "bg", "s1", "s2", "s3", "hair2", "hair", "field", "outl", "tx2", "tx3", "tx", "or-hi", "or-lo", "or-w", "or-ring",
  "ortx", "or", "gold", "pos-w", "pos", "warn-w", "warn", "neg-w", "neg", "info-w", "info", "vibertx", "viber",
  "plate", "paper", "ink", "scrim",
];
const rename = {
  "f-d": "font-display", "f-u": "font-sans", "f-m": "font-mono",
  "r-xs": "radius-xs", "r-sm": "radius-sm", "r-md": "radius-md", "r-lg": "radius-lg", "r-xl": "radius-xl",
  "h-sm": "spacing-control-sm", "h-md": "spacing-control-md", "h-lg": "spacing-control-lg", "h-xl": "spacing-control-xl",
  gut: "spacing-gutter", wrap: "container-content", "sh-pop": "shadow-pop", bnav: "bottom-nav",
};
for (const c of colors) rename[c] = "color-" + c;

// Split a stylesheet into top-level blocks: plain rules, and @container blocks with their inner rules.
function blocks(css) {
  const out = [];
  let i = 0;
  while (i < css.length) {
    const open = css.indexOf("{", i);
    if (open < 0) break;
    const head = css.slice(i, open).trim();
    let depth = 1;
    let j = open + 1;
    while (j < css.length && depth > 0) {
      if (css[j] === "{") depth++;
      else if (css[j] === "}") depth--;
      j++;
    }
    out.push({ head, body: css.slice(open + 1, j - 1) });
    i = j;
  }
  return out;
}

const keep = (sel) =>
  sel.split(",").every((s) => s.trim().startsWith("." + prefix)) && !drop.test(sel);

const seen = new Set();
const lines = [];
for (const src of sources) {
  const html = fs.readFileSync(src, "utf8").replace(/\r\n/g, "\n").replace(/\/\*[\s\S]*?\*\//g, "");
  const css = [...html.matchAll(/<style>([\s\S]*?)<\/style>/g)].map((m) => m[1]).join("\n");
  for (const b of blocks(css)) {
    if (b.head.startsWith("@container")) {
      const inner = blocks(b.body)
        .filter((r) => keep(r.head))
        .map((r) => `${r.head}{${r.body.trim()}}`);
      if (!inner.length) continue;
      const text = `${b.head}{${inner.join("")}}`;
      if (!seen.has(text)) {
        seen.add(text);
        lines.push(text);
      }
    } else if (keep(b.head)) {
      const text = `${b.head}{${b.body.trim()}}`;
      if (!seen.has(text)) {
        seen.add(text);
        lines.push(text);
      }
    }
  }
}

let css = lines.join("\n");
css = css.replace(/var\(--([a-z0-9-]+)\)/g, (m, name) => (rename[name] ? `var(--${rename[name]})` : m));
css = css.replace(/(\d*\.?\d+)cqi/g, "$1vw");
css = css.replace(/@container sa \(max-width:(\d+)px\)/g, (m, w) => `@media (max-width:${Number(w) + 0.98}px)`);
css = css.replace(/@container sa \(min-width:(\d+)px\)/g, "@media (min-width:$1px)");
const leftovers = [...css.matchAll(/var\(--([a-z0-9-]+)\)/g)].map((m) => m[1]).filter((n) => !/^(color|font|radius|spacing|container|shadow|bottom-nav|ch|ps|chamfer)/.test(n));
if (leftovers.length) throw new Error("Unmapped variables: " + [...new Set(leftovers)].join(", "));
if (/@container|cqi/.test(css)) throw new Error("Board-only syntax left over");

const header = `/*
  ${title}
  Ported by script from the screen's board sources (apps/web/scripts/port-board-css.mjs), as kit.css is from the kit: token
  names follow tokens.css, the boards' cqi became vw and their container queries media queries. Board-only parts
  (device frames, preview overlays) were left out. Class prefix: ${prefix}.
*/
@layer components {
`;
fs.writeFileSync(out, header + css.split("\n").map((l) => "  " + l).join("\n") + "\n}\n");
console.log("written", out, lines.length, "rules");
