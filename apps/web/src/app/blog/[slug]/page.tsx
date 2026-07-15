import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Container, LinkButton } from "@/components/common";
import { InquiryButton } from "@/components/inquiry";
import { SiteFooter, SiteHeader } from "@/components/layout";
import { SITE_URL } from "@/constants";
import { formatBgDate, getAllPosts, getPostBySlug } from "@/lib/blog";
import { buildArticleJsonLd, buildBreadcrumbJsonLd } from "@/lib/site-jsonld";

/**
 * /blog/[slug] — one markdown post (content/blog/{slug}.md — see lib/blog.ts).
 * Fully static: `generateStaticParams` enumerates the content dir, so every post
 * prerenders at build; adding a post = adding a file + rebuilding.
 *
 * Markdown renders server-side via react-markdown (a pure component — no client
 * JS shipped) + remark-gfm for tables, which the cost guides rely on. Styling is
 * per-element via the `components` map (the repo has no typography plugin).
 * Article (BlogPosting) JSON-LD carries the byline + dates (E-E-A-T).
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
    openGraph: {
      title: post.title,
      description: post.description,
      url: canonical,
      type: "article",
    },
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
      <main className="flex-1 bg-[#fafafa] pt-(--header-h) text-ink">
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />

        <Container className="max-w-195 py-12 max-md:py-8">
          <nav className="mb-5 text-sm text-muted">
            <Link href="/" className="hover:text-brand-dark">
              Начало
            </Link>
            <span className="px-2">/</span>
            <Link href="/blog" className="hover:text-brand-dark">
              Блог
            </Link>
            <span className="px-2">/</span>
            <span className="text-ink">{post.title}</span>
          </nav>

          <article>
            <header className="mb-8">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">
                {formatBgDate(post.date)}
                {post.updated !== post.date ? ` · обновена ${formatBgDate(post.updated)}` : ""}
                {` · ${post.author}`}
              </p>
              <h1 className="text-4xl font-black tracking-tight text-ink max-md:text-3xl">{post.title}</h1>
            </header>

            <div className="text-[15px] leading-[1.85] text-[#2e3238]">
              <Markdown
                remarkPlugins={[remarkGfm]}
                components={{
                  h2: (props) => (
                    <h2 className="mb-3 mt-10 text-2xl font-black text-ink" {...omitNode(props)} />
                  ),
                  h3: (props) => (
                    <h3 className="mb-2 mt-7 text-lg font-extrabold text-ink" {...omitNode(props)} />
                  ),
                  p: (props) => <p className="mb-4" {...omitNode(props)} />,
                  ul: (props) => <ul className="mb-4 list-disc pl-6" {...omitNode(props)} />,
                  ol: (props) => <ol className="mb-4 list-decimal pl-6" {...omitNode(props)} />,
                  li: (props) => <li className="mb-1.5" {...omitNode(props)} />,
                  a: (props) => (
                    <a className="font-semibold text-brand-dark hover:underline" {...omitNode(props)} />
                  ),
                  strong: (props) => <strong className="font-extrabold text-ink" {...omitNode(props)} />,
                  blockquote: (props) => (
                    <blockquote
                      className="mb-4 border-l-4 border-brand/50 bg-white py-2 pl-4 pr-3 text-[#5a5d64]"
                      {...omitNode(props)}
                    />
                  ),
                  table: (props) => (
                    <div className="mb-4 overflow-x-auto">
                      <table className="w-full border-collapse text-sm" {...omitNode(props)} />
                    </div>
                  ),
                  th: (props) => (
                    <th
                      className="border-b-2 border-line bg-white px-3 py-2 text-left font-extrabold text-ink"
                      {...omitNode(props)}
                    />
                  ),
                  td: (props) => <td className="border-b border-line px-3 py-2" {...omitNode(props)} />,
                  hr: () => <hr className="my-8 border-line" />,
                }}
              >
                {post.content}
              </Markdown>
            </div>
          </article>

          {/* Funnel CTA — every post ends in the money pages. */}
          <section className="mt-12 rounded-card bg-linear-to-r from-brand-dark to-brand p-8 text-center max-md:p-6">
            <h2 className="mb-2 text-2xl font-black text-white max-md:text-xl">
              Искаш точна сметка за конкретен автомобил?
            </h2>
            <p className="mx-auto mb-5 max-w-xl text-sm/relaxed text-white/85">
              Използвай калкулатора за ориентир или ни кажи марка, модел и бюджет — изготвяме персонална калкулация,
              без скрити такси.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <LinkButton
                href="/kalkulator"
                rippleTheme="dark"
                className="inline-flex min-h-13 items-center justify-center rounded-full bg-white px-7 text-sm font-extrabold uppercase tracking-wide text-brand-dark transition-transform duration-200 hover:-translate-y-0.5"
              >
                Калкулатор за внос
              </LinkButton>
              <InquiryButton
                rippleTheme="dark"
                className="inline-flex min-h-13 items-center justify-center rounded-full border border-white/40 px-7 text-sm font-extrabold uppercase tracking-wide text-white transition-transform duration-200 hover:-translate-y-0.5"
              >
                Направи запитване
              </InquiryButton>
            </div>
          </section>
        </Container>
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
