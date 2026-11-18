import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { LinkButton } from "@/components/common";
import { CalculatorIcon, CalendarIcon } from "@/components/icons";
import { InquiryButton } from "@/components/inquiry";
import { SiteFooter, SiteHeader } from "@/components/layout";
import { SITE_URL } from "@/constants";
import { formatBgDate, getAllPosts, getPostBySlug } from "@/lib/blog";
import { rehypeTableCards } from "@/lib/rehype-table-cards";
import { buildArticleJsonLd, buildBreadcrumbJsonLd } from "@/lib/site-jsonld";
import { buildSocialMeta } from "@/lib/social-meta";

/**
 * /blog/[slug] — one markdown post (content/blog/{slug}.md — see lib/blog.ts).
 * Fully static: `generateStaticParams` enumerates the content dir, so every post
 * prerenders at build; adding a post = adding a file + rebuilding.
 *
 * Markdown renders server-side via react-markdown (a pure component — no client
 * JS shipped) + remark-gfm for tables, which the cost guides rely on. Styling is
 * per-element via the `components` map (the repo has no typography plugin).
 * Article (BlogPosting) JSON-LD carries the byline + dates (E-E-A-T).
 *
 * Look: boards `in-blog-post` and `in-blog-elements`: the article in the kit's prose beside a sticky aside with the
 * calculator and the inquiry; tables turn into labelled cards on a phone (lib/rehype-table-cards). Classes in
 * styles/info-blog-post.css under the page's root class `.in-post-pg`; parity check docs/design/parity/blog.md.
 */

type Params = Promise<{ slug: string }>;

export function generateStaticParams(): { slug: string }[] {
  return getAllPosts().map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const post = getPostBySlug((await params).slug);
  if (!post) return { title: "Статия | SelectAuto", robots: { index: false, follow: true } };
  const canonical = `${SITE_URL}/blog/${post.slug}`;
  return {
    title: `${post.title} | SelectAuto`,
    description: post.description,
    alternates: { canonical },
    ...buildSocialMeta({
      title: post.title,
      description: post.description,
      path: `/blog/${post.slug}`,
      type: "article",
      article: {
        publishedTime: post.date,
        modifiedTime: post.updated,
        authors: [post.author],
      },
    }),
  };
}

export default async function BlogPostPage({ params }: { params: Params }) {
  const post = getPostBySlug((await params).slug);
  if (!post) notFound();

  const path = `/blog/${post.slug}`;
  const articleJsonLd = buildArticleJsonLd({
    title: post.title,
    description: post.description,
    url: path,
    datePublished: post.date,
    dateModified: post.updated,
    authorName: post.author,
  });
  const breadcrumbJsonLd = buildBreadcrumbJsonLd([
    { name: "Начало", url: "/" },
    { name: "Блог", url: "/blog" },
    { name: post.title, url: path },
  ]);

  return (
    <>
      <SiteHeader />
      <main className="in-post-pg flex-1 pt-(--header-h)">
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />

        <section className="in-head">
          <div className="sa-wrap">
            <div className="in-box in-head__in">
              <nav className="sa-crumbs" aria-label="Пътечка">
                <Link href="/">Начало</Link>
                <i aria-hidden="true">/</i>
                <Link href="/blog">Блог</Link>
                <i aria-hidden="true">/</i>
                <span aria-current="page">{post.title}</span>
              </nav>
              <p className="in-meta">
                <CalendarIcon />
                <span>
                  {formatBgDate(post.date)}
                  {post.updated !== post.date ? ` · обновена ${formatBgDate(post.updated)}` : ""}
                  {` · ${post.author}`}
                </span>
              </p>
              <h1 className="type-h1">{post.title}</h1>
            </div>
          </div>
        </section>

        <section className="sa-band">
          <div className="sa-wrap">
            <div className="in-box in-art">
              <article className="sa-prose">
                <Markdown
                  remarkPlugins={[remarkGfm]}
                  rehypePlugins={[rehypeTableCards]}
                  components={{
                    a: (props) => <a className="underline underline-offset-3" {...omitNode(props)} />,
                    blockquote: (props) => (
                      <blockquote className="mb-4.5 rounded-md bg-s2 px-4 py-3 text-tx2" {...omitNode(props)} />
                    ),
                    em: (props) => <em className="text-tx3" {...omitNode(props)} />,
                    hr: () => <hr className="mt-2 mb-5.5 h-px border-0 bg-hair2" />,
                    table: (props) => (
                      <div className="sa-tbl-wrap">
                        <table className="sa-tbl" {...omitNode(props)} />
                      </div>
                    ),
                  }}
                >
                  {post.content}
                </Markdown>
              </article>

              {/* Funnel CTA — every post ends in the money pages; on a desktop it stays beside the article. */}
              <aside className="in-side top-[calc(var(--header-h)+35px)]">
                <div className="sa-pnl sa-stack gap-3.5">
                  <span className="sa-pnl__ic">
                    <CalculatorIcon />
                  </span>
                  <h2 className="type-h3">Искате точна сметка за конкретен автомобил?</h2>
                  <p className="sa-p">
                    Използвайте калкулатора за ориентир или ни кажете марка, модел и бюджет — изготвяме персонална
                    калкулация, без скрити такси.
                  </p>
                  <LinkButton href="/kalkulator" variant="pri" size="xl">
                    <CalculatorIcon />
                    Калкулатор за внос
                  </LinkButton>
                  <InquiryButton variant="sec" size="xl">
                    Направете запитване
                  </InquiryButton>
                </div>
              </aside>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}

/** Strip react-markdown's non-DOM `node` prop before spreading onto elements. */
function omitNode<T extends { node?: unknown }>(props: T): Omit<T, "node"> {
  const rest = { ...props };
  delete rest.node;
  return rest;
}
