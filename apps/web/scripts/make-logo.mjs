#!/usr/bin/env node
/**
 * Make one car-make logo for `public/brand-logos` from a source file (docs/make-logos.md, „How each file was made“):
 *
 * - **SVG:** cleaned (no scripts, event handlers, `foreignObject` or links outside the file); white-only artwork painted
 *   in the plate's ink with `--recolor` (never inside `<mask>` or `<clipPath>`, where white means „shown“); rendered and
 *   trimmed to the pixels it actually draws (geometry bounds count clip paths and invisible shapes). A pure vector
 *   stays an SVG; one with a raster inside, or over 40 KB, becomes a raster.
 * - **PNG, WebP, JPEG, GIF:** a white matte dropped when the file has no transparency (`--black-matte` drops a black
 *   one instead, for white art on a black box); `--recolor` as above; then cropped (`--crop first|last` keeps the
 *   first or last group of columns, e.g. an emblem beside a wordmark; `--red-emblem` keeps the red pixels' box) and
 *   trimmed.
 * - **Both:** never taller than wide (the plate is a grid whose row grows with a tall image), at most 256 px on the long
 *   side, PNG or WebP (quality 0.9), whichever is smaller.
 *
 * Usage (from apps/web):
 *   node scripts/make-logo.mjs <source file> <slug> [--recolor] [--black-matte] [--crop first|last] [--red-emblem]
 * It prints the file it wrote; add that make's id → file to `src/data/make-logos.ts` and a row to docs/make-logos.md,
 * then run `pnpm test` (tests/make-logos.test.mts checks the files). The browser is the installed Google Chrome;
 * without it, run `pnpm exec playwright-core install chromium` and set PW_CHANNEL=chromium.
 */
import { chromium } from "playwright-core";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const args = process.argv.slice(2);
const [src, slug] = args.filter((a, i) => !a.startsWith("--") && args[i - 1] !== "--crop");
const crop = args.includes("--crop") ? args[args.indexOf("--crop") + 1] : null;
if (!src || !slug || !/^[a-z0-9-]+$/.test(slug) || (crop && crop !== "first" && crop !== "last")) {
  console.error(
    "usage: node scripts/make-logo.mjs <source file> <slug: a-z, 0-9, -> [--recolor] [--black-matte] [--crop first|last] [--red-emblem]",
  );
  process.exit(2);
}
const ops = [
  ...(args.includes("--recolor") ? ["recolor"] : []),
  ...(args.includes("--black-matte") ? ["black-matte"] : []),
  ...(crop ? [`crop-${crop}-run`] : []),
  ...(args.includes("--red-emblem") ? ["red-bbox"] : []),
];
const DIR = fileURLToPath(new URL("../public/brand-logos/", import.meta.url));
const INK = "#15171b"; // --color-ink in src/styles/tokens.css: the plate's text colour
const MAX_SVG = 40 * 1024;
const MAX_SIDE = 256;
const CHANNEL = process.env.PW_CHANNEL ?? "chrome";

const ext = src.split(".").pop().toLowerCase();
const bytes = readFileSync(src);
const isSvg = ext === "svg" || bytes.subarray(0, 300).toString("utf8").includes("<svg");

const browser = await chromium.launch(CHANNEL ? { channel: CHANNEL } : {});
const page = await browser.newPage();
await page.setContent("<!doctype html><body style='margin:0'><div id=stage style='width:512px'></div></body>");
const res = await page
  .evaluate(
    async ({ isSvg, b64, ops, INK, MAX_SVG, MAX_SIDE, mime }) => {
      const notes = [];
      const whiteish = (r, g, b) => r >= 225 && g >= 225 && b >= 225;
      const parseRgb = (v) => {
        const m = /rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)/.exec(v || "");
        return m ? [+m[1], +m[2], +m[3]] : null;
      };
      const canvas = (w, h) => {
        const c = document.createElement("canvas");
        c.width = Math.max(1, Math.round(w));
        c.height = Math.max(1, Math.round(h));
        return c;
      };
      const loadImage = (url) =>
        new Promise((ok, bad) => {
          const im = new Image();
          im.onload = () => ok(im);
          im.onerror = () => bad(new Error("image failed to load"));
          im.src = url;
        });
      const alphaBox = (c) => {
        const d = c.getContext("2d").getImageData(0, 0, c.width, c.height).data;
        let x0 = c.width, y0 = c.height, x1 = -1, y1 = -1;
        for (let y = 0; y < c.height; y++)
          for (let i = 0; i < c.width; i++)
            if (d[(y * c.width + i) * 4 + 3] > 8) {
              if (i < x0) x0 = i;
              if (i > x1) x1 = i;
              if (y < y0) y0 = y;
              if (y > y1) y1 = y;
            }
        return x1 < 0 ? null : { x0, y0, x1, y1 };
      };
      // Crop to the drawn pixels plus a 2 % margin; a tall image gets side margins up to a square.
      const trim = (c) => {
        const b = alphaBox(c);
        if (!b) throw new Error("nothing visible");
        const w = b.x1 - b.x0 + 1, h = b.y1 - b.y0 + 1;
        const p = Math.round(Math.max(w, h) * 0.02);
        const W = Math.max(w, h) + 2 * p, H = h + 2 * p;
        const t = canvas(W, H);
        t.getContext("2d").drawImage(c, b.x0, b.y0, w, h, Math.round((W - w) / 2), p, w, h);
        return t;
      };
      const downscale = (c) => {
        while (Math.max(c.width, c.height) > MAX_SIDE * 2) {
          const h = canvas(c.width / 2, c.height / 2);
          const x = h.getContext("2d");
          x.imageSmoothingQuality = "high";
          x.drawImage(c, 0, 0, h.width, h.height);
          c = h;
        }
        const s = Math.min(1, MAX_SIDE / Math.max(c.width, c.height));
        if (s === 1) return c;
        const f = canvas(c.width * s, c.height * s);
        const x = f.getContext("2d");
        x.imageSmoothingQuality = "high";
        x.drawImage(c, 0, 0, f.width, f.height);
        return f;
      };
      // Lossless PNG, or WebP at 0.9 when that is smaller (chrome badges and gradients are 3–5× smaller as WebP).
      const raster = (c) => {
        const p = c.toDataURL("image/png"), w = c.toDataURL("image/webp", 0.9);
        const webp = w.startsWith("data:image/webp") && w.length < p.length * 0.85;
        return { kind: webp ? "webp" : "png", data: webp ? w : p, notes };
      };
      const rasterOps = (c) => {
        const x = c.getContext("2d");
        const img = x.getImageData(0, 0, c.width, c.height);
        const d = img.data;
        let transparent = 0;
        for (let i = 3; i < d.length; i += 4) if (d[i] < 250) transparent++;
        if (transparent === 0) {
          const cs = [0, (c.width - 1) * 4, (c.height - 1) * c.width * 4, (c.height * c.width - 1) * 4];
          if (ops.includes("black-matte")) {
            // White art on a black box: black becomes transparent, and the grey of anti-aliased edges becomes alpha.
            if (!cs.every((o) => d[o] <= 30 && d[o + 1] <= 30 && d[o + 2] <= 30)) throw new Error("no black matte");
            for (let i = 0; i < d.length; i += 4) {
              const lum = Math.max(d[i], d[i + 1], d[i + 2]);
              d[i + 3] = lum <= 30 ? 0 : Math.min(255, Math.round(((lum - 30) / 225) * 255));
              d[i] = d[i + 1] = d[i + 2] = 255;
            }
            notes.push("black matte removed");
          } else if (cs.every((o) => whiteish(d[o], d[o + 1], d[o + 2]))) {
            for (let i = 0; i < d.length; i += 4) if (d[i] >= 245 && d[i + 1] >= 245 && d[i + 2] >= 245) d[i + 3] = 0;
            notes.push("white matte removed");
          }
        }
        if (ops.includes("recolor")) {
          const [r, g, b] = [1, 3, 5].map((o) => parseInt(INK.slice(o, o + 2), 16));
          let n = 0;
          for (let i = 0; i < d.length; i += 4) {
            const mx = Math.max(d[i], d[i + 1], d[i + 2]), mn = Math.min(d[i], d[i + 1], d[i + 2]);
            if (d[i + 3] > 0 && mn >= 170 && mx - mn <= 40) {
              d[i] = r;
              d[i + 1] = g;
              d[i + 2] = b;
              n++;
            }
          }
          notes.push(`recolored ${n} px`);
        }
        x.putImageData(img, 0, 0);
        if (ops.includes("red-bbox")) {
          let x0 = c.width, y0 = c.height, x1 = -1, y1 = -1;
          for (let y = 0; y < c.height; y++)
            for (let i = 0; i < c.width; i++) {
              const o = (y * c.width + i) * 4;
              if (d[o + 3] > 20 && d[o] > 150 && d[o + 1] < 90 && d[o + 2] < 90) {
                if (i < x0) x0 = i;
                if (i > x1) x1 = i;
                if (y < y0) y0 = y;
                if (y > y1) y1 = y;
              }
            }
          if (x1 < 0) throw new Error("no red pixels");
          const t = canvas(x1 - x0 + 1, y1 - y0 + 1);
          t.getContext("2d").drawImage(c, x0, y0, t.width, t.height, 0, 0, t.width, t.height);
          notes.push("cropped to the red emblem");
          return t;
        }
        const which = ops.includes("crop-last-run") ? "last" : ops.includes("crop-first-run") ? "first" : null;
        if (which) {
          // Groups of columns with artwork, split by gaps of at least 6 px (letters' own gaps are narrower).
          const cols = [];
          for (let i = 0; i < c.width; i++) {
            let on = false;
            for (let y = 0; y < c.height && !on; y++) if (d[(y * c.width + i) * 4 + 3] > 20) on = true;
            cols.push(on);
          }
          const runs = [];
          let start = -1, gap = 0;
          for (let i = 0; i < cols.length; i++) {
            if (cols[i]) {
              if (start < 0) start = i;
              else if (gap >= 6) {
                runs.push([start, i - gap - 1]);
                start = i;
              }
              gap = 0;
            } else if (start >= 0) gap++;
          }
          if (start >= 0) runs.push([start, cols.length - 1 - gap]);
          const [a, z] = which === "last" ? runs[runs.length - 1] : runs[0];
          const t = canvas(z - a + 1, c.height);
          t.getContext("2d").drawImage(c, a, 0, t.width, c.height, 0, 0, t.width, c.height);
          notes.push(`kept the ${which} of ${runs.length} column groups`);
          return t;
        }
        return c;
      };

      if (!isSvg) {
        const im = await loadImage(`data:${mime};base64,${b64}`);
        const c = canvas(im.naturalWidth, im.naturalHeight);
        c.getContext("2d").drawImage(im, 0, 0);
        return raster(downscale(trim(rasterOps(c))));
      }

      // ---- SVG: clean ----
      const text = new TextDecoder().decode(Uint8Array.from(atob(b64), (ch) => ch.charCodeAt(0)));
      const doc = new DOMParser().parseFromString(text, "image/svg+xml");
      if (doc.querySelector("parsererror")) throw new Error("svg parse error");
      const root = doc.documentElement;
      for (const sel of ["script", "foreignObject", "iframe", "embed", "object", "metadata", "title", "desc"])
        for (const el of [...root.querySelectorAll(sel)]) el.remove();
      for (const a of [...root.querySelectorAll("a")]) a.replaceWith(...a.childNodes);
      for (const el of [root, ...root.querySelectorAll("*")]) {
        for (const at of [...el.attributes]) {
          const n = at.name.toLowerCase(), v = at.value.trim();
          if (n.startsWith("on")) el.removeAttribute(at.name);
          else if ((n === "href" || n === "xlink:href") && !v.startsWith("#") && !/^data:image\/(png|jpe?g|webp|gif);/i.test(v)) {
            el.removeAttribute(at.name);
            notes.push(`dropped external ${n}`);
          } else if (/javascript:/i.test(v)) el.removeAttribute(at.name);
        }
      }
      for (const st of root.querySelectorAll("style")) st.textContent = st.textContent.replace(/@import[^;]+;/g, "");
      const walker = doc.createTreeWalker(root, NodeFilter.SHOW_COMMENT | NodeFilter.SHOW_PROCESSING_INSTRUCTION);
      const dead = [];
      while (walker.nextNode()) dead.push(walker.currentNode);
      dead.forEach((n) => n.remove());

      // ---- SVG: the author's region; recolor ----
      const stage = document.getElementById("stage");
      stage.innerHTML = "";
      const live = document.importNode(root, true);
      let region = (live.getAttribute("viewBox") || "").trim().split(/[\s,]+/).map(Number);
      const wa = live.getAttribute("width") || "", ha = live.getAttribute("height") || "";
      live.removeAttribute("width");
      live.removeAttribute("height");
      live.style.width = "512px";
      live.style.height = "auto";
      stage.appendChild(live);
      if (!(region.length === 4 && region.every(Number.isFinite) && region[2] > 0 && region[3] > 0)) {
        if (parseFloat(wa) > 0 && parseFloat(ha) > 0 && !wa.includes("%") && !ha.includes("%"))
          region = [0, 0, parseFloat(wa), parseFloat(ha)];
        else {
          const b = live.getBBox();
          region = [b.x, b.y, b.width, b.height];
        }
      }
      if (ops.includes("recolor")) {
        let n = 0;
        for (const el of live.querySelectorAll("*")) {
          if (el.closest("mask, clipPath")) continue;
          const cs = getComputedStyle(el);
          for (const p of ["fill", "stroke", "stop-color"]) {
            const rgb = parseRgb(cs.getPropertyValue(p));
            if (rgb && whiteish(...rgb)) {
              el.style.setProperty(p, INK);
              n++;
            }
          }
        }
        notes.push(`recolored ${n} paints`);
      }
      live.removeAttribute("style");
      live.setAttribute("xmlns", "http://www.w3.org/2000/svg");
      if (live.innerHTML.includes("xlink:")) live.setAttribute("xmlns:xlink", "http://www.w3.org/1999/xlink");
      for (const at of ["id", "class", "data-name", "role", "aria-label", "aria-hidden", "focusable", "x", "y", "enable-background", "xml:space", "version"])
        live.removeAttribute(at);
      const serialize = () => new XMLSerializer().serializeToString(live).replace(/\s{2,}/g, " ").replace(/>\s+</g, "><");

      // ---- SVG: render the region at 1024 px and trim to what is drawn ----
      const S = 1024 / Math.max(region[2], region[3]);
      const cw = Math.round(region[2] * S), ch = Math.round(region[3] * S);
      live.setAttribute("viewBox", region.join(" "));
      live.setAttribute("width", String(cw));
      live.setAttribute("height", String(ch));
      const hasRaster = !!live.querySelector("image");
      const full = serialize();
      const im = await loadImage(URL.createObjectURL(new Blob([full], { type: "image/svg+xml" })));
      const c = canvas(cw, ch);
      c.getContext("2d").drawImage(im, 0, 0, cw, ch);
      const bb = alphaBox(c);
      if (!bb) throw new Error("nothing visible");
      if (hasRaster || full.length > MAX_SVG) {
        notes.push(hasRaster ? "raster inside the SVG: saved as a raster" : `rasterized (${Math.round(full.length / 1024)} KB as SVG)`);
        // A raster inside the SVG can only be recolored as pixels.
        return raster(downscale(trim(hasRaster && ops.includes("recolor") ? rasterOps(c) : c)));
      }
      let x = region[0] + bb.x0 / S, y = region[1] + bb.y0 / S;
      let w = (bb.x1 - bb.x0 + 1) / S, h = (bb.y1 - bb.y0 + 1) / S;
      const pad = Math.max(w, h) * 0.02;
      x -= pad;
      y -= pad;
      w += 2 * pad;
      h += 2 * pad;
      if (h > w) {
        x -= (h - w) / 2;
        w = h;
      }
      live.setAttribute("viewBox", [x, y, w, h].map((v) => +v.toFixed(3)).join(" "));
      live.setAttribute("preserveAspectRatio", "xMidYMid meet");
      const L = 128 / Math.max(w, h);
      live.setAttribute("width", String(Math.round(w * L)));
      live.setAttribute("height", String(Math.round(h * L)));
      return { kind: "svg", data: serialize(), notes };
    },
    {
      isSvg,
      b64: bytes.toString("base64"),
      ops,
      INK,
      MAX_SVG,
      MAX_SIDE,
      mime:
        ext === "jpg" || ext === "jpeg" ? "image/jpeg" : ext === "webp" ? "image/webp" : ext === "gif" ? "image/gif" : "image/png",
    },
  )
  .catch((e) => ({ error: String(e.message || e) }));
await browser.close();

if (res.error) {
  console.error(`${src}: ${res.error}`);
  process.exit(1);
}
const file = `${slug}.${res.kind}`;
writeFileSync(DIR + file, res.kind === "svg" ? res.data : Buffer.from(res.data.split(",")[1], "base64"));
const others = ["svg", "png", "webp"].filter((e) => e !== res.kind && existsSync(`${DIR}${slug}.${e}`));
console.log(`public/brand-logos/${file}${res.notes.length ? ` (${res.notes.join("; ")})` : ""}`);
if (others.length) console.log(`also there: ${others.map((e) => `${slug}.${e}`).join(", ")}; remove the one no make uses`);
