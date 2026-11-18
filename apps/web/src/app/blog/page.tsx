import type { Metadata } from "next";
import Link from "next/link";
import { LinkButton } from "@/components/common";
import { ArrowRightIcon, CalendarIcon } from "@/components/icons";
import { SiteFooter, SiteHeader } from "@/components/layout";
import { SITE_URL } from "@/constants";
import { formatBgDate, getAllPosts } from "@/lib/blog";
import { buildBreadcrumbJsonLd, buildItemListJsonLd } from "@/lib/site-jsonld";
import { buildSocialMeta } from "@/lib/social-meta";

/**
 * /blog — the topical-authority index (docs/13-seo-action-plan.md Phase C).
 * Posts are markdown files in content/blog (see lib/blog.ts); this page lists
 * them newest-first. Fully static (filesystem reads only).
 *
 * Look: boards `in-blog`, `in-blog-empty`; classes in styles/info-blog.css under the page's root class `.in-blog-pg`;
 * parity check docs/design/parity/blog.md.
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
      <main className="in-blog-pg flex-1 pt-(--header-h)">
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />
        {posts.length > 0 ? (
          <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListJsonLd) }} />
        ) : null}

        <section className="in-head">
          <div className="sa-wrap in-head__in">
            <nav className="sa-crumbs" aria-label="Пътечка">
              <Link href="/">Начало</Link>
              <i aria-hidden="true">/</i>
              <span aria-current="page">Блог</span>
            </nav>
            <h1 className="type-h1">Блог</h1>
            <p className="sa-lead max-w-[72ch]">
              Практични статии за вноса на автомобили от Корея, САЩ и Канада — реални числа, проверени ставки и
              отговори на въпросите, които се задават преди покупка.
            </p>
          </div>
        </section>

        <section className="sa-band">
          <div className="sa-wrap">
            {posts.length === 0 ? (
              <div className="in-empty">
                <p className="sa-p text-center">Още няма публикувани статии — очаквайте скоро.</p>
              </div>
            ) : (
              <div className="sa-grid in-posts">
                {posts.map((p) => (
                  <article key={p.slug} className="sa-pnl in-post">
                    <p className="in-post__d">
                      <CalendarIcon />
                      {formatBgDate(p.date)}
                    </p>
                    <h2>
                      <Link href={`/blog/${p.slug}`}>{p.title}</Link>
                    </h2>
                    <p className="sa-small">{p.description}</p>
                    <LinkButton href={`/blog/${p.slug}`} variant="txt" size="md" aria-label={`Прочетете: ${p.title}`}>
                      Прочетете
                      <ArrowRightIcon />
                    </LinkButton>
                  </article>
                ))}
              </div>
            )}
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
