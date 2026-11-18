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
//
// The make and model hubs (styles/hub-page.css), no hand edits:
//
//   node <repo>/apps/web/scripts/port-board-css.mjs hm- <repo>/apps/web/src/styles/hub-page.css \
//     'hm-(sk\b|w\b|st__cap|var\b|gridmsg)' "The make and model hubs (boards hm-make*, hm-model*, hm-hub-*): …" \
//     hm-make.html hm-model.html hm-make-thin.html hm-make-empty.html hm-model-thin.html hm-model-empty.html \
//     hm-hub-loading.html
//
// The import hubs and the calculators (styles/import-page.css), no hand edits — every im- board carries the same
// stylesheet, so one source is enough:
//
//   node <repo>/apps/web/scripts/port-board-css.mjs im- <repo>/apps/web/src/styles/import-page.css \
//     'im-(wiz|run|tiles?|rd\b|sheet|b\b|b__|sx|g[234]\b|hr\b|frame|flowpad|shift|tall|msgs|total--first|dlgheads|dlg--head|dlgcenter|dlgph\b|dlgph__scroll|dlgbg|top\b|dlgwrap|trig|pop\b|loc\b|ph\b)' \
//     "The import hubs and the calculators (boards im-*): …" im-calc.html
// The info pages (styles/info-*.css), one file per screen, each scoped to its page's root class because the in- boards
// reuse class names with different rules per screen. The FAQ page:
//
//   PORT_SCOPE=.in-faq-pg node <repo>/apps/web/scripts/port-board-css.mjs in- <repo>/apps/web/src/styles/info-faq.css \
//     '^$' "The FAQ page (board in-faq): …" in-faq.html
//
// The contacts page, its main board first so its rules win over the spec board's:
//
//   PORT_SCOPE=.in-kontakti-pg PORT_FIRST_WINS=1 node <repo>/apps/web/scripts/port-board-css.mjs in- \
//     <repo>/apps/web/src/styles/info-kontakti.css 'in-(spec|fl\b|fl__|copy--ic|toast|live|pair)' \
//     "The contacts page, /kontakti (…): …" in-kontakti.html in-kontakti-spec.html
//
import fs from "node:fs";

const [prefix, out, dropPattern, title, ...sources] = process.argv.slice(2);
const drop = new RegExp(dropPattern);
// PORT_SCOPE (optional): a class put before every selector, for a screen whose boards reuse class names that other
// screens of the same prefix define differently (the info pages' `.in-head`, `.in-cta`): `.in-faq-pg .in-head{…}`.
const scope = process.env.PORT_SCOPE || "";
const scoped = (sel) => (scope ? sel.split(",").map((s) => `${scope} ${s.trim()}`).join(",") : sel);
// PORT_FIRST_WINS=1 (optional): a selector already taken from an earlier source is skipped in later ones, so a screen's
// main board wins over its state or spec boards, which redefine some rules for their own layout.
const firstWins = process.env.PORT_FIRST_WINS === "1";
const taken = new Set();
const fresh = (key) => {
  if (!firstWins) return true;
  if (taken.has(key)) return false;
  taken.add(key);
  return true;
};

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
        .filter((r) => keep(r.head) && fresh(`${b.head} ${r.head}`))
        .map((r) => `${scoped(r.head)}{${r.body.trim()}}`);
      if (!inner.length) continue;
      const text = `${b.head}{${inner.join("")}}`;
      if (!seen.has(text)) {
        seen.add(text);
        lines.push(text);
      }
    } else if (keep(b.head) && fresh(b.head)) {
      const text = `${scoped(b.head)}{${b.body.trim()}}`;
      if (!seen.has(text)) {
        seen.add(text);
        lines.push(text);
      }
    }
  }
}

let css = lines.join("\n");
// The admin's boards are `ad-`, but ad blockers hide elements whose class reads like an ad: EasyList hides `.ad-main`,
// `.ad-side`, `.ad-grid` and thousands more `.ad-*`, which left the admin blank for anyone running one (18.11.2026).
// So the code's admin classes are `bo-` („back office"), and a port of the ad- boards writes them so.
const outPrefix = prefix === "ad-" ? "bo-" : prefix;
if (outPrefix !== prefix) css = css.replace(new RegExp(`\\.${prefix}(?=[A-Za-z0-9])`, "g"), `.${outPrefix}`);
css = css.replace(/var\(--([a-z0-9-]+)\)/g, (m, name) => (rename[name] ? `var(--${rename[name]})` : m));
css = css.replace(/(\d*\.?\d+)cqi/g, "$1vw");
css = css.replace(/@container sa \(max-width:(\d+)px\)/g, (m, w) => `@media (max-width:${Number(w) + 0.98}px)`);
css = css.replace(/@container sa \(min-width:(\d+)px\)/g, "@media (min-width:$1px)");
// Variables the ported rules declare themselves (a rail's `--n`, `--g`) are fine; anything else must be a token.
const declared = new Set([...css.matchAll(/--([a-z0-9-]+)\s*:/g)].map((m) => m[1]));
const leftovers = [...css.matchAll(/var\(--([a-z0-9-]+)\)/g)]
  .map((m) => m[1])
  .filter((n) => !declared.has(n) && !/^(color|font|radius|spacing|container|shadow|bottom-nav|ch|ps|chamfer)/.test(n));
if (leftovers.length) throw new Error("Unmapped variables: " + [...new Set(leftovers)].join(", "));
// Queries on the board's frame (`sa`) became media queries above. Queries on a container the ported rules declare
// themselves (`container: ablist / inline-size` on the ab- lists, as the code's own registers do) are real and stay.
const ownContainers = new Set([...css.matchAll(/container:\s*([a-z][a-z0-9-]*)\s*\//g)].map((m) => m[1]));
const foreign = [...css.matchAll(/@container\s+([a-z][a-z0-9-]*)/g)].map((m) => m[1]).filter((n) => !ownContainers.has(n));
if (/cqi/.test(css) || foreign.length) throw new Error("Board-only syntax left over: " + [...new Set(foreign)].join(", "));

const header = `/*
  ${title}
  Ported by script from the screen's board sources (apps/web/scripts/port-board-css.mjs), as kit.css is from the kit: token
  names follow tokens.css, the boards' cqi became vw and their queries on the board's frame media queries (queries on a
  container these rules declare stay container queries). Board-only parts (device frames, preview overlays) were left
  out. Class prefix: ${outPrefix}${outPrefix !== prefix ? ` (the boards' ${prefix}: ad blockers hide .ad-* elements)` : ""}.${scope ? ` Scoped to ${scope}, the page's root.` : ""}
*/
@layer components {
`;
fs.writeFileSync(out, header + css.split("\n").map((l) => "  " + l).join("\n") + "\n}\n");
console.log("written", out, lines.length, "rules");
