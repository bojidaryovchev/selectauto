import type { Metadata } from "next";
import Link from "next/link";
import { Container } from "@/components/common";
import { SiteFooter, SiteHeader } from "@/components/layout";
import { SITE_URL } from "@/constants";
import { formatBgDate, getAllPosts } from "@/lib/blog";
import { buildBreadcrumbJsonLd, buildItemListJsonLd } from "@/lib/site-jsonld";
import { buildSocialMeta } from "@/lib/social-meta";

/**
 * /blog — the topical-authority index (docs/13-seo-action-plan.md Phase C).
 * Posts are markdown files in content/blog (see lib/blog.ts); this page lists
 * them newest-first. Fully static (filesystem reads only).
 */

const PATH = "/blog";
const CANONICAL = `${SITE_URL}${PATH}`;

export const metadata: Metadata = {
  title: "Блог — внос на автомобили, цени и съвети | SelectAuto",
  description:
    "Практични статии за внос на автомобили от Корея, САЩ и Канада — колко струва, как се проверява история, мита и такси, регистрация в КАТ. Без увъртане, с реални числа.",
  alternates: { canonical: CANONICAL },
  ...buildSocialMeta({
    title: "Блог — внос на автомобили, цени и съвети | SelectAuto",
    description:
      "Практични статии за внос на автомобили — колко струва, проверка на история, мита и такси, КАТ.",
    path: PATH,
  }),
};

export default function BlogIndexPage() {
  const posts = getAllPosts();
  const breadcrumbJsonLd = buildBreadcrumbJsonLd([
    { name: "Начало", url: "/" },
    { name: "Блог", url: PATH },
  ]);
  const itemListJsonLd = buildItemListJsonLd(
    posts.map((p) => ({ url: `${PATH}/${p.slug}`, name: p.title })),
  );

  return (
    <>
      <SiteHeader />
      <main className="flex-1 bg-[#fafafa] pt-(--header-h) text-ink">
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />
        {posts.length > 0 ? (
          <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListJsonLd) }} />
        ) : null}

        <Container className="max-w-245 py-12 max-md:py-8">
          <nav className="mb-5 text-sm text-muted">
            <Link href="/" className="hover:text-brand-dark">
              Начало
            </Link>
            <span className="px-2">/</span>
            <span className="text-ink">Блог</span>
          </nav>

          <h1 className="mb-3 text-4xl font-black uppercase tracking-tight text-ink max-md:text-3xl">Блог</h1>
          <p className="mb-8 max-w-2xl text-[15px] leading-[1.8] text-[#3d4046]">
            Практични статии за вноса на автомобили от Корея, САЩ и Канада — реални числа, проверени ставки и
            отговори на въпросите, които се задават преди покупка.
          </p>

          {posts.length === 0 ? (
            <p className="text-sm text-muted">Още няма публикувани статии — очаквайте скоро.</p>
          ) : (
            <div className="flex flex-col gap-4">
              {posts.map((p) => (
                <article key={p.slug} className="rounded-2xl border border-line bg-white p-6 shadow-card max-md:p-5">
                  <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted">
                    {formatBgDate(p.date)}
                  </p>
                  <h2 className="mb-2 text-xl font-black text-ink">
                    <Link href={`/blog/${p.slug}`} className="hover:text-brand-dark">
                      {p.title}
                    </Link>
                  </h2>
                  <p className="mb-3 text-sm/relaxed text-[#5a5d64]">{p.description}</p>
                  <Link href={`/blog/${p.slug}`} className="text-sm font-bold text-brand-dark hover:underline">
                    Прочети →
                  </Link>
                </article>
              ))}
            </div>
          )}
        </Container>
      </main>
      <SiteFooter />
    </>
  );
}
