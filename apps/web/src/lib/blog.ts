import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";

/**
 * Markdown blog content layer (docs/13-seo-action-plan.md Phase C: /blog +
 * Article schema). Posts are plain `.md` files in `apps/web/content/blog/` with
 * gray-matter frontmatter; the SLUG is the filename (kebab-case, no extension) —
 * it becomes the URL `/blog/{slug}`, so treat renames as URL changes.
 *
 * Required frontmatter:
 *   title:       page <h1> / <title> base
 *   description: meta description (≈150–160 chars)
 *   date:        ISO date (YYYY-MM-DD) — datePublished
 * Optional:
 *   updated:     ISO date — dateModified (defaults to `date`)
 *   author:      display name (defaults to "SelectAuto"; use NAMED experts for
 *                E-E-A-T once bios exist — docs/13 Phase C)
 *   draft:       `true` hides the post everywhere — excluded from the index,
 *                `generateStaticParams`, the sitemap, AND `getPostBySlug` (a draft
 *                slug 404s), so a work-in-progress `.md` is never published/indexed.
 *   cover:       the post's photo (decision 43): its card on /blog, the top of the post, the share image and the
 *                Article's `image`. A 1920×1080 JPEG in public/images/blog/, cut from the source photo by
 *                `scripts/blog-cover.mjs`, which also writes the credit below into the file (IPTC/XMP).
 *                  src         "/images/blog/{slug}.jpg". The image optimizer keeps each size for 31 days and can't
 *                              be told to forget one, so a new photo gets a new file name, never the old one.
 *                  alt         what the photo shows, in Bulgarian
 *                  focus       optional CSS object-position for the post's wider crop, e.g. "50% 80%"
 *                  author      the photographer as the source names them, with "(Unsplash)" or "(FEMA)" after the
 *                              name when the photo reached Wikimedia Commons from there
 *                  license     "CC BY-SA 4.0", "CC BY 4.0", "CC0" or "обществено достояние"
 *                  licenseUrl  the license's Bulgarian deed on creativecommons.org (the Public Domain Mark for
 *                              public domain)
 *                  source      the photo's page on Wikimedia Commons, where its license is documented
 *                Only photos whose license allows commercial use and changes: CC0, public domain, CC BY, CC BY-SA.
 *                The credits are on one page, /snimki-i-litsenzi, linked from every page's footer (decision 44):
 *                title, author, source, license and the note that the cover is cut from the photo („изрязана"),
 *                which CC licenses allow in „any reasonable manner", a link to a credits page included. Under
 *                CC BY-SA the cut photo keeps the same license.
 *
 * All reads are synchronous filesystem work on a small directory — deterministic
 * at build/prerender time (no request data), so blog routes stay fully static
 * under Cache Components. Files sort by `date` descending.
 */

/** A post's photo and its credit (the `cover` frontmatter above). */
export type BlogCover = {
  src: string;
  alt: string;
  /** CSS object-position; "50% 50%" unless the frontmatter sets one. */
  focus: string;
  author: string;
  license: string;
  licenseUrl: string;
  source: string;
};

/** Every cover is cut to this size (scripts/blog-cover.mjs), so the pages and the share tags can state it. */
export const COVER_WIDTH = 1920;
export const COVER_HEIGHT = 1080;

const COVER_SRC = /^\/images\/blog\/[a-z0-9-]+\.jpg$/;
const COVER_LICENSE = /^(CC0|CC BY(-SA)? \d\.\d|обществено достояние)$/;
const COVER_FOCUS = /^\d{1,3}% \d{1,3}%$/;
const HTTPS_URL = /^https:\/\/\S+$/;

/** True when the license asks for the credit and a note of changes (CC BY, CC BY-SA). */
export function coverNeedsAttribution(cover: BlogCover): boolean {
  return cover.license.startsWith("CC BY");
}

/** The name of the site a cover came from, for its credit line. */
export function coverSourceName(cover: BlogCover): string {
  const host = new URL(cover.source).hostname;
  return host.endsWith("wikimedia.org") ? "Wikimedia Commons" : host.replace(/^www\./, "");
}

/** The photo's own title, as its source names it (CC BY-SA 3.0 asks for it): the Commons file name, read. */
export function coverWorkTitle(cover: BlogCover): string {
  const file = cover.source.split("/wiki/File:")[1];
  return file ? decodeURIComponent(file).replace(/_/g, " ").replace(/\.[a-z0-9]+$/i, "").trim() : "";
}

/** The `cover` frontmatter, checked field by field. A broken cover is logged and dropped; the post still shows. */
function readCover(file: string, raw: unknown): BlogCover | null {
  if (raw === undefined || raw === null) return null;
  const c = (typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const str = (key: string) => (typeof c[key] === "string" ? (c[key] as string).trim() : "");
  const cover: BlogCover = {
    src: str("src"),
    alt: str("alt"),
    focus: str("focus") || "50% 50%",
    author: str("author"),
    license: str("license"),
    licenseUrl: str("licenseUrl"),
    source: str("source"),
  };
  const problems = [
    !COVER_SRC.test(cover.src) && "src",
    !cover.alt && "alt",
    !COVER_FOCUS.test(cover.focus) && "focus",
    !cover.author && "author",
    !COVER_LICENSE.test(cover.license) && "license",
    !HTTPS_URL.test(cover.licenseUrl) && "licenseUrl",
    !HTTPS_URL.test(cover.source) && "source",
  ].filter(Boolean);
  if (problems.length > 0) {
    console.error(`[blog] ${file}: cover dropped, check ${problems.join(", ")}`);
    return null;
  }
  return cover;
}

export type BlogPostMeta = {
  slug: string;
  title: string;
  description: string;
  /** ISO YYYY-MM-DD. */
  date: string;
  /** ISO YYYY-MM-DD; defaults to `date`. */
  updated: string;
  author: string;
  /** `true` = work-in-progress; hidden from listing/sitemap/routes. */
  draft: boolean;
  /** The post's photo, or null when it has none (the card then shows a calm empty field). */
  cover: BlogCover | null;
};

export type BlogPost = BlogPostMeta & {
  /** Raw markdown body (frontmatter stripped). */
  content: string;
};

const BLOG_DIR = path.join(process.cwd(), "content", "blog");

/** "2026-07-16" → "16.07.2026" (string work only — no Date, no locale/tz). */
export function formatBgDate(iso: string): string {
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${m[3]}.${m[2]}.${m[1]}` : iso;
}

function readPost(file: string): BlogPost | null {
  const slug = file.replace(/\.md$/, "");
  try {
    const raw = fs.readFileSync(path.join(BLOG_DIR, file), "utf8");
    const { data, content } = matter(raw);
    const title = typeof data.title === "string" ? data.title.trim() : "";
    const description = typeof data.description === "string" ? data.description.trim() : "";
    const date = typeof data.date === "string" ? data.date : data.date instanceof Date ? data.date.toISOString().slice(0, 10) : "";
    if (!title || !description || !date) {
      console.error(`[blog] ${file}: missing required frontmatter (title/description/date) — skipped`);
      return null;
    }
    const updatedRaw = data.updated;
    const updated =
      typeof updatedRaw === "string" ? updatedRaw : updatedRaw instanceof Date ? updatedRaw.toISOString().slice(0, 10) : date;
    return {
      slug,
      title,
      description,
      date,
      updated,
      author: typeof data.author === "string" && data.author.trim() ? data.author.trim() : "SelectAuto",
      draft: data.draft === true,
      cover: readCover(file, data.cover),
      content,
    };
  } catch (error) {
    console.error(`[blog] failed to read ${file}`, error);
    return null;
  }
}

/** All posts, newest first. Empty array when the content dir is absent. */
export function getAllPosts(): BlogPost[] {
  let files: string[];
  try {
    files = fs.readdirSync(BLOG_DIR).filter((f) => f.endsWith(".md"));
  } catch {
    return [];
  }
  return files
    .map(readPost)
    .filter((p): p is BlogPost => p !== null && !p.draft)
    .sort((a, b) => (a.date < b.date ? 1 : -1));
}

/** One PUBLISHED post by slug (filename without .md), or null. Slug is
 *  path-sanitized; drafts resolve to null so a draft URL 404s. */
export function getPostBySlug(slug: string): BlogPost | null {
  if (!/^[a-z0-9-]+$/.test(slug)) return null;
  if (!fs.existsSync(path.join(BLOG_DIR, `${slug}.md`))) return null;
  const post = readPost(`${slug}.md`);
  return post && !post.draft ? post : null;
}
