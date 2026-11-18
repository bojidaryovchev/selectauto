#!/usr/bin/env node
/**
 * The phone layout guard (REDESIGN.md, step 6). Opens every page of a running build at 320 and 390 px and fails on:
 * - sideways scroll;
 * - a button, chip, tag, tab, segment or page number whose label wraps onto a second line or spills out of it (the
 *   owner's rule: labels stay on one line), or that the screen's edge cuts off, in the page or in a fixed bar;
 * - a visible text field under 16 px, which makes iOS Safari zoom in when it's focused (phone widths only).
 *
 * It only reads. The local app talks to the live database and the live e-mail service, so every request that isn't a
 * GET is aborted, and a mail thread (/admin/poshta/<id>, which saves message bodies when viewed) is never opened.
 *
 * Usage, against a build (`pnpm build && pnpm start -p 3107`):
 *   pnpm check:layout -- --base http://localhost:3107
 *   pnpm check:layout -- --only /kalkulator,/blog --widths 320
 *   SA_SESSION=<the authjs.session-token cookie of a staff account> pnpm check:layout -- --admin
 * The browser is the installed Google Chrome. Without it, run `pnpm exec playwright-core install chromium` and set
 * PW_CHANNEL=chromium.
 */
import { chromium } from "playwright-core";

const args = process.argv.slice(2);
const arg = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i === -1 ? fallback : args[i + 1];
};
const BASE = arg("base", "http://localhost:3000").replace(/\/$/, "");
const WIDTHS = arg("widths", "320,390").split(",").map(Number);
const ONLY = arg("only", "")?.split(",").filter(Boolean) ?? [];
const ADMIN = args.includes("--admin");
const SESSION = process.env.SA_SESSION;
const CHANNEL = process.env.PW_CHANNEL ?? "chrome";

/** Pages without parameters. The car, hub, blog-post and contract pages are found from these. */
const PUBLIC = [
  "/",
  "/vsichki-avtomobili",
  "/kalkulator",
  "/lizingov-kalkulator",
  "/byudzheten-kalkulator",
  "/vnos-na-koli-ot-korea",
  "/vnos-na-koli-ot-sasht",
  "/vnos-na-koli-ot-kanada",
  "/chesto-zadavani-vaprosi",
  "/kontakti",
  "/za-nas",
  "/otzivi",
  "/carfax",
  "/proverka-vin",
  "/proces",
  "/blog",
  "/obshti-usloviya",
  "/politika-za-poveritelnost",
  "/politika-za-biskvitki",
  "/sign-in",
  "/registratsiya",
  "/zabravena-parola",
  "/nova-parola",
  "/verify",
  "/greshka-pri-vhod",
  "/lyubimi",
  "/nyama-takava-stranitsa",
];
const ADMIN_PAGES = [
  "/admin",
  "/admin/zapitvaniya",
  "/admin/carfax",
  "/admin/oferti",
  "/admin/poshta",
  "/admin/dogovori",
  "/admin/dogovori/nov",
  "/admin/depoziti",
  "/admin/skriti-obyavi",
  "/admin/mobile-bg",
  "/admin/tarifi",
  "/admin/poluchateli",
  "/admin/potrebiteli",
  "/admin/dnevnik",
];
const MAIL_THREAD = /^\/admin\/poshta\/[^/?#]+/;

/** Elements drawn as buttons. Plain <button>s with running text (an FAQ question) may wrap, so they aren't here. */
const BUTTONS = [
  ".sa-btn",
  ".sa-ib",
  ".sa-chip",
  ".sa-tag",
  ".sa-src",
  ".sa-seg > button",
  ".sa-seg > a",
  ".sa-tabs > a",
  ".sa-tabs > button",
  ".sa-pager a",
  ".sa-pager button",
].join(", ");

function inspect(buttons) {
  const root = document.documentElement;
  const shown = (el) => {
    if (!el.getClientRects().length) return false;
    const style = getComputedStyle(el);
    return style.visibility !== "hidden" && !el.closest('[aria-hidden="true"], [inert], .sr-only, .sa-sr');
  };
  const label = (el) => (el.innerText || el.getAttribute("aria-label") || "").replace(/\s+/g, " ").trim().slice(0, 60);
  const lines = (el) => {
    const tops = [];
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      if (!node.textContent.trim() || node.parentElement.closest(".sr-only, .sa-sr")) continue;
      const range = document.createRange();
      range.selectNodeContents(node);
      for (const rect of range.getClientRects()) {
        if (rect.width > 0 && !tops.some((top) => Math.abs(top - rect.top) < 3)) tops.push(rect.top);
      }
    }
    return tops.length;
  };
  /**
   * How much the label (its text on one line, its icons and the gaps) needs beyond the button less 8 px of room on
   * each side. A centred label that doesn't fit eats into the side padding before it overflows, which overflow alone
   * doesn't show; down to 8 px a side it still reads as a button.
   */
  const excess = (el) => {
    const style = getComputedStyle(el);
    const before = el.style.whiteSpace;
    el.style.whiteSpace = "nowrap";
    let text = 0;
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      if (!node.textContent.trim() || node.parentElement.closest(".sr-only, .sa-sr")) continue;
      const range = document.createRange();
      range.selectNodeContents(node);
      text += range.getBoundingClientRect().width;
    }
    el.style.whiteSpace = before;
    const icons = [...el.querySelectorAll("svg, img")].filter((icon) => icon.getClientRects().length);
    const parts = (text ? 1 : 0) + icons.length;
    const need =
      text +
      icons.reduce((sum, icon) => sum + icon.getBoundingClientRect().width, 0) +
      Math.max(0, parts - 1) * (parseFloat(style.columnGap) || 0);
    const room = el.clientWidth - 2 * Math.min(8, parseFloat(style.paddingLeft), parseFloat(style.paddingRight));
    return need - room;
  };
  const controls = [...document.querySelectorAll(buttons)].filter(shown);
  const wrapped = controls
    .map((el) => ({ el, over: lines(el) > 1 ? Infinity : excess(el) }))
    .filter(({ over }) => over > 1)
    .map(
      ({ el, over }) =>
        `„${label(el)}" (${Math.round(el.getBoundingClientRect().width)} px${over === Infinity ? ", two lines" : `, ${Math.ceil(over)} px short`})`,
    );
  // A control cut off by the screen's edge, in the page or in a fixed bar (which can't scroll sideways at all).
  const cut = controls
    .filter((el) => {
      const r = el.getBoundingClientRect();
      return r.right > root.clientWidth + 0.5 || r.left < -0.5;
    })
    // Inside a sideways scroller or a clipped carousel it is reached by scrolling, not cut off.
    .filter((el) => {
      for (let up = el.parentElement; up && up !== document.body; up = up.parentElement) {
        if (getComputedStyle(up).overflowX !== "visible") return false;
      }
      return true;
    })
    .map(
      (el) =>
        `„${label(el)}" (${Math.round(el.getBoundingClientRect().left)}–${Math.round(el.getBoundingClientRect().right)} px)`,
    );
  // Content spilling out of its slot in a fixed action bar, where it lands on the buttons beside it.
  for (const el of document.querySelectorAll(".sa-bar > *")) {
    if (shown(el) && el.scrollWidth > el.clientWidth + 1)
      cut.push(`„${label(el)}" spills over its neighbours in the bar`);
  }
  const fields = [
    ...document.querySelectorAll(
      'input:not([type="checkbox"], [type="radio"], [type="range"], [type="hidden"], [type="file"], [type="submit"], [type="button"], [type="color"], [type="image"], [type="reset"]), select, textarea',
    ),
  ]
    .filter(shown)
    .filter((el) => parseFloat(getComputedStyle(el).fontSize) < 16)
    .map((el) => `${el.tagName.toLowerCase()}${el.name ? `[name="${el.name}"]` : ""} ${getComputedStyle(el).fontSize}`);
  return {
    layout: root.clientWidth,
    sideways: root.scrollWidth - root.clientWidth,
    wrapped,
    cut,
    fields: [...new Set(fields)],
  };
}

if (ADMIN && !SESSION) throw new Error("--admin needs SA_SESSION: the authjs.session-token cookie of a staff account");
const browser = await chromium.launch(CHANNEL ? { channel: CHANNEL } : {});
let context;
let page;

/**
 * A fresh page at `width`. Under 768 px it is a phone: a desktop browser keeps a classic scrollbar that takes 15 px
 * of the width, while a phone's scrollbar floats over the page, so a phone check needs the phone's emulation.
 */
async function openAt(width) {
  await context?.close();
  const phone = width < 768;
  context = await browser.newContext({
    viewport: { width, height: 800 },
    isMobile: phone,
    hasTouch: phone,
    deviceScaleFactor: phone ? 2 : 1,
  });
  if (ADMIN) await context.addCookies([{ name: "authjs.session-token", value: SESSION, url: BASE }]);
  await context.route("**/*", (route) => {
    const request = route.request();
    const url = new URL(request.url());
    if (request.method() !== "GET") return route.abort();
    if (url.origin === new URL(BASE).origin && MAIL_THREAD.test(url.pathname)) return route.abort();
    return route.continue();
  });
  page = await context.newPage();
}

async function open(path) {
  const response = await page.goto(BASE + path, { waitUntil: "load", timeout: 60_000 });
  await page.waitForLoadState("networkidle", { timeout: 8_000 }).catch(() => {});
  // Measure in the real fonts, never in a fallback that hasn't been swapped yet.
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(400);
  return response;
}

/** The paths of the links on the open page that match `selector`, in page order. */
const hrefs = (selector) =>
  page.$$eval(selector, (links) => [...new Set(links.map((a) => a.getAttribute("href")).filter(Boolean))]);

/** One page of each kind that takes a parameter: a car, a make hub and one of its models, a blog post, a contract. */
async function found() {
  const out = [];
  const depth = (href) => href.split(/[?#]/)[0].split("/").filter(Boolean).length;
  await open("/vsichki-avtomobili");
  out.push(...(await hrefs('a[href^="/avtomobil/"]')).slice(0, 1));
  // The home page's brand grid links every make hub; a make hub links its models.
  await open("/");
  const make = (await hrefs('a[href^="/avtomobili/marka/"]')).find((h) => depth(h) === 3);
  if (make) {
    out.push(make);
    await open(make);
    out.push(...(await hrefs('a[href^="/avtomobili/marka/"]')).filter((h) => depth(h) === 4).slice(0, 1));
  }
  await open("/blog");
  out.push(...(await hrefs('a[href^="/blog/"]')).slice(0, 1));
  if (ADMIN) {
    await open("/admin/dogovori");
    out.push(...(await hrefs('a[href^="/admin/dogovori/"]:not([href$="/nov"])')).slice(0, 1));
  }
  return out;
}

await openAt(WIDTHS[0]);
const pages = ONLY.length ? ONLY : [...PUBLIC, ...(ADMIN ? ADMIN_PAGES : []), ...(await found())];

let failures = 0;
for (const width of WIDTHS) {
  await openAt(width);
  for (const path of [...new Set(pages)]) {
    if (MAIL_THREAD.test(path)) continue;
    const response = await open(path);
    const { layout, sideways, wrapped, cut, fields } = await page.evaluate(inspect, BUTTONS);
    const problems = [
      layout !== width ? `lays out at ${layout} px, not ${width}` : null,
      sideways > 0 ? `scrolls sideways by ${sideways} px` : null,
      ...wrapped.map((b) => `label doesn't fit: ${b}`),
      ...cut.map((b) => `cut off by the screen's edge: ${b}`),
      // iOS Safari zooms into a focused field under 16 px. Only the phone contexts can say anything about that: a
      // desktop browser never zooms, and a field that is 16 px on iOS only (`supports-[-webkit-touch-callout:none]`,
      // the tariff paste boxes) can't be seen from desktop Chrome.
      ...(width < 768 ? fields.map((f) => `field under 16 px (iOS zooms): ${f}`) : []),
    ].filter(Boolean);
    const status = response ? response.status() : "—";
    if (problems.length) {
      failures += problems.length;
      console.log(`✖ ${width} ${path} (${status})`);
      for (const problem of problems) console.log(`    ${problem}`);
    } else {
      console.log(`✔ ${width} ${path} (${status})`);
    }
  }
}
await browser.close();
console.log(failures ? `\n${failures} problem(s).` : "\nNo problems.");
process.exitCode = failures ? 1 : 0;
