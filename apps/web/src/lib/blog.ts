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
 *
 * All reads are synchronous filesystem work on a small directory — deterministic
 * at build/prerender time (no request data), so blog routes stay fully static
 * under Cache Components. Files sort by `date` descending.
 */

export type BlogPostMeta = {
  slug: string;
  title: string;
  description: string;
  /** ISO YYYY-MM-DD. */
  date: string;
  /** ISO YYYY-MM-DD; defaults to `date`. */
  updated: string;
  author: string;
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
    .filter((p): p is BlogPost => p !== null)
    .sort((a, b) => (a.date < b.date ? 1 : -1));
}

/** One post by slug (filename without .md), or null. Slug is path-sanitized. */
export function getPostBySlug(slug: string): BlogPost | null {
  if (!/^[a-z0-9-]+$/.test(slug)) return null;
  if (!fs.existsSync(path.join(BLOG_DIR, `${slug}.md`))) return null;
  return readPost(`${slug}.md`);
}
