/**
 * The blog's covers (decision 43; the fields in src/lib/blog.ts, the files from scripts/blog-cover.mjs):
 *
 * - every published post has a cover that passes the content layer's checks (a dropped cover leaves a card without
 *   its photo and a post without its credit);
 * - each cover is its own JPEG in public/images/blog, exactly 1920×1080 and at most 600 KB, and no file there is
 *   left unused;
 * - the license allows commercial use and changes (CC0, public domain, CC BY, CC BY-SA), and its link is that license's
 *   Bulgarian deed;
 * - the source is the photo's page on Wikimedia Commons, where its license is documented;
 * - the file carries its credit (XMP): the author and the license link;
 * - the credits page has what it needs: the photo's title, read from its source, and the footer's link to the page on
 *   every page, which is what lets the photos go without a caption (decision 44).
 *
 * Run with `pnpm --filter @selectauto/web test`.
 */
import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { describe, test } from "node:test";
import { fileURLToPath } from "node:url";

// Computed specifiers: Node strips the types when it loads the files, and TypeScript doesn't ask for `.ts` imports.
const { getAllPosts, coverWorkTitle, COVER_WIDTH, COVER_HEIGHT } = await import(
  new URL("../src/lib/blog.ts", import.meta.url).href
);
const { FOOTER_LEGAL } = await import(new URL("../src/data/navigation.ts", import.meta.url).href);

type Cover = { src: string; alt: string; author: string; license: string; licenseUrl: string; source: string };
type Post = { slug: string; cover: Cover | null };

const PUBLIC = fileURLToPath(new URL("../public", import.meta.url));
const DIR = `${PUBLIC}/images/blog`;
const MAX_BYTES = 600 * 1024;
const posts = getAllPosts() as Post[];

/** The Bulgarian deed each license must link to. */
function deedFor(license: string): string | null {
  if (license === "CC0") return "https://creativecommons.org/publicdomain/zero/1.0/deed.bg";
  if (license === "обществено достояние") return "https://creativecommons.org/publicdomain/mark/1.0/deed.bg";
  const m = license.match(/^CC (BY|BY-SA) (\d\.\d)$/);
  return m ? `https://creativecommons.org/licenses/${m[1].toLowerCase()}/${m[2]}/deed.bg` : null;
}

/** Width and height of a JPEG, from its start-of-frame segment. */
function jpegSize(file: string, bytes: Buffer): [number, number] {
  assert.ok(bytes[0] === 0xff && bytes[1] === 0xd8, `${file} is not a JPEG`);
  for (let i = 2; i + 9 < bytes.length;) {
    assert.equal(bytes[i], 0xff, `${file}: no JPEG marker at byte ${i}`);
    const marker = bytes[i + 1];
    if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
      return [bytes.readUInt16BE(i + 7), bytes.readUInt16BE(i + 5)];
    }
    i += 2 + bytes.readUInt16BE(i + 2);
  }
  throw new Error(`${file}: no start-of-frame segment`);
}

const xml = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

describe("the blog's covers", () => {
  test("the posts were found (the test runs in apps/web)", () => {
    assert.ok(posts.length > 0, "no posts: run the tests from apps/web");
  });

  test("every published post has a cover", () => {
    assert.deepEqual(
      posts.filter((p) => !p.cover).map((p) => p.slug),
      [],
    );
  });

  test("each cover is its own 1920×1080 JPEG, and every file in the folder is used", () => {
    const used = posts.flatMap((p) => (p.cover ? [p.cover.src] : []));
    assert.equal(new Set(used).size, used.length, "two posts share a cover");
    for (const src of used) {
      const file = `${PUBLIC}${src}`;
      assert.ok(existsSync(file), `${src} is missing`);
      const bytes = readFileSync(file);
      assert.ok(bytes.length <= MAX_BYTES, `${src} is ${Math.round(bytes.length / 1024)} KB`);
      assert.deepEqual(
        jpegSize(src, bytes),
        [COVER_WIDTH, COVER_HEIGHT],
        `${src} is not ${COVER_WIDTH}×${COVER_HEIGHT}`,
      );
    }
    const unused = readdirSync(DIR).filter((name) => !used.includes(`/images/blog/${name}`));
    assert.deepEqual(unused, [], "files in public/images/blog that no post uses");
  });

  test("each license allows commercial use and changes, linked to its Bulgarian deed", () => {
    for (const { slug, cover } of posts) {
      if (!cover) continue;
      const deed = deedFor(cover.license);
      assert.ok(deed, `${slug}: „${cover.license}" is not CC0, public domain, CC BY or CC BY-SA`);
      assert.equal(cover.licenseUrl, deed, `${slug}: the license link`);
    }
  });

  test("the credits page has every photo's title, and every page's footer links it", () => {
    for (const { slug, cover } of posts) {
      if (cover) assert.ok(coverWorkTitle(cover), `${slug}: no title could be read from the source`);
    }
    const legal = FOOTER_LEGAL as { href: string }[];
    assert.ok(
      legal.some((l) => l.href === "/snimki-i-litsenzi"),
      "the footer's legal row no longer links /snimki-i-litsenzi",
    );
  });

  test("each source is the photo's page on Wikimedia Commons", () => {
    for (const { slug, cover } of posts) {
      if (!cover) continue;
      assert.match(cover.source, /^https:\/\/commons\.wikimedia\.org\/wiki\/File:\S+$/, `${slug}: the source`);
    }
  });

  test("each file carries its credit: the author and the license link", () => {
    for (const { slug, cover } of posts) {
      if (!cover) continue;
      const bytes = readFileSync(`${PUBLIC}${cover.src}`);
      for (const needle of [
        `<rdf:li>${xml(cover.author)}</rdf:li>`,
        `xmpRights:WebStatement="${xml(cover.licenseUrl)}"`,
      ]) {
        assert.ok(
          bytes.includes(Buffer.from(needle, "utf8")),
          `${slug}: the file has no ${needle} (scripts/blog-cover.mjs)`,
        );
      }
    }
  });
});
