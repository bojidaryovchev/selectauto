#!/usr/bin/env node
/**
 * Cut a blog post's cover (decision 43) from its source photo:
 *
 * - scaled and cropped to 1920×1080 (16:9): the card on /blog, the top of the post (a wider crop of it, placed by the
 *   frontmatter's `focus`), the share image and the Article's `image`;
 * - a progressive JPEG at quality 80 (mozjpeg), in sRGB, with every camera field dropped, GPS included;
 * - the credit written into the file as XMP, in the fields Google Images reads: Creator, Credit Line, Copyright
 *   Notice, Web Statement of Rights and Licensor URL (developers.google.com/search/docs/appearance/structured-data/
 *   image-license-metadata). Google also asks that these rights fields survive optimization, so they travel with
 *   the photo.
 *
 * The post's frontmatter must carry its `cover` first (src/lib/blog.ts lists the fields): the file goes to that `src`
 * under public/, and the credit comes from it. Only photos whose license allows commercial use and changes: CC0,
 * public domain, CC BY, CC BY-SA. A new photo for a post gets a new file name (the optimizer's 31-day cache).
 *
 * Usage (from apps/web):
 *   node scripts/blog-cover.mjs <source photo> <post slug> [--x 0..1] [--y 0..1]
 * --x and --y place the 16:9 window in the scaled photo, from 0 (left, top) to 1 (right, bottom); the default, 0.5, is
 * the centre. Then run `pnpm test`: tests/blog-covers.test.mts checks every cover, its size and its credit.
 */
import matter from "gray-matter";
import sharp from "sharp";
import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

const W = 1920;
const H = 1080;

const args = process.argv.slice(2);
const placement = (name) => (args.includes(`--${name}`) ? Number(args[args.indexOf(`--${name}`) + 1]) : 0.5);
const [src, slug] = args.filter((a, i) => !a.startsWith("--") && !args[i - 1]?.startsWith("--"));
const fx = placement("x");
const fy = placement("y");
if (!src || !slug || !/^[a-z0-9-]+$/.test(slug) || !(fx >= 0 && fx <= 1) || !(fy >= 0 && fy <= 1)) {
  console.error("usage: node scripts/blog-cover.mjs <source photo> <post slug> [--x 0..1] [--y 0..1]");
  process.exit(2);
}

const postFile = fileURLToPath(new URL(`../content/blog/${slug}.md`, import.meta.url));
if (!existsSync(postFile)) {
  console.error(`there is no post content/blog/${slug}.md`);
  process.exit(2);
}
const cover = matter(readFileSync(postFile, "utf8")).data.cover ?? {};
for (const key of ["src", "author", "license", "licenseUrl", "source"]) {
  if (typeof cover[key] !== "string" || !cover[key].trim()) {
    console.error(`content/blog/${slug}.md: the frontmatter has no cover.${key} (src/lib/blog.ts lists the fields)`);
    process.exit(2);
  }
}
if (!/^\/images\/blog\/[a-z0-9-]+\.jpg$/.test(cover.src)) {
  console.error(`content/blog/${slug}.md: cover.src must be /images/blog/<name>.jpg`);
  process.exit(2);
}

// The credit, as the post's caption gives it (app/blog/[slug]/page.tsx).
const attribution = cover.license.startsWith("CC BY");
const host = new URL(cover.source).hostname;
const sourceName = host.endsWith("wikimedia.org") ? "Wikimedia Commons" : host.replace(/^www\./, "");
const notice = attribution
  ? `© ${cover.author}, ${cover.license}`
  : cover.license === "CC0"
    ? `${cover.author}, CC0 1.0 (no rights reserved)`
    : `${cover.author}, public domain`;
const xml = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const xmp = `<?xpacket begin="\u{FEFF}" id="W5M0MpCehiHzreSzNTczkc9d"?>
<x:xmpmeta xmlns:x="adobe:ns:meta/">
 <rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">
  <rdf:Description rdf:about=""
    xmlns:dc="http://purl.org/dc/elements/1.1/"
    xmlns:photoshop="http://ns.adobe.com/photoshop/1.0/"
    xmlns:xmpRights="http://ns.adobe.com/xap/1.0/rights/"
    xmlns:plus="http://ns.useplus.org/ldf/xmp/1.0/"
    photoshop:Credit="${xml(`${cover.author} / ${sourceName}`)}"
    xmpRights:Marked="${attribution ? "True" : "False"}"
    xmpRights:WebStatement="${xml(cover.licenseUrl)}">
   <dc:creator><rdf:Seq><rdf:li>${xml(cover.author)}</rdf:li></rdf:Seq></dc:creator>
   <dc:rights><rdf:Alt><rdf:li xml:lang="x-default">${xml(notice)}</rdf:li></rdf:Alt></dc:rights>
   <dc:source>${xml(cover.source)}</dc:source>
   <plus:Licensor><rdf:Seq><rdf:li rdf:parseType="Resource"><plus:LicensorURL>${xml(cover.source)}</plus:LicensorURL></rdf:li></rdf:Seq></plus:Licensor>
  </rdf:Description>
 </rdf:RDF>
</x:xmpmeta>
<?xpacket end="w"?>`;

// Scale so the photo covers 1920×1080, then cut the window.
const { autoOrient } = await sharp(src).metadata();
const { width: w, height: h } = autoOrient;
const scale = Math.max(W / w, H / h);
if (scale > 1)
  console.warn(`warning: ${w}×${h} is smaller than ${W}×${H}, so the cover is upscaled and will look soft`);
const rw = Math.max(W, Math.round(w * scale));
const rh = Math.max(H, Math.round(h * scale));
const out = fileURLToPath(new URL(`../public${cover.src}`, import.meta.url));
mkdirSync(dirname(out), { recursive: true });
const info = await sharp(src)
  .autoOrient()
  .resize({ width: rw, height: rh, fit: "fill" })
  .extract({ left: Math.round((rw - W) * fx), top: Math.round((rh - H) * fy), width: W, height: H })
  .jpeg({ quality: 80, progressive: true, mozjpeg: true })
  .withXmp(xmp)
  .toFile(out);
console.log(
  `public${cover.src}: ${w}×${h} → ${W}×${H}, ${Math.round(info.size / 1024)} KB, credit „${cover.author} / ${sourceName}"`,
);
