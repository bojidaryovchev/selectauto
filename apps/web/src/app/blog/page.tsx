import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { LinkButton } from "@/components/common";
import { ArrowRightIcon, CalendarIcon, CameraIcon } from "@/components/icons";
import { SiteFooter, SiteHeader } from "@/components/layout";
import { SITE_URL } from "@/constants";
import { COVER_HEIGHT, COVER_WIDTH, formatBgDate, getAllPosts } from "@/lib/blog";
import { buildBreadcrumbJsonLd, buildItemListJsonLd } from "@/lib/site-jsonld";
import { buildSocialMeta } from "@/lib/social-meta";

/**
 * /blog — the topical-authority index (docs/13-seo-action-plan.md Phase C).
 * Posts are markdown files in content/blog (see lib/blog.ts); this page lists
 * them newest-first. Fully static (filesystem reads only).
 *
 * Look: boards `in-blog`, `in-blog-empty`; classes in styles/info-blog.css under the page's root class `.in-blog-pg`;
 * parity check docs/design/parity/blog.md. Decision 43 (24.11.2026): every card leads with its post's photo, and the
 * cards stay wide enough for a long title to read across: one column on a phone, one row per post with the photo
 * beside the text on a tablet, then two or three columns, never more.
 *
 * The photo is a second way into the post for the mouse only (`tabIndex={-1}`, `aria-hidden`): keyboard and screen
 * reader users keep the title and „Прочетете", as before. The photos' credits are on /snimki-i-litsenzi, linked from
 * the footer (decision 44).
 */

/**
 * How wide a card's photo is in each layout of styles/info-blog.css, for the browser's pick from the srcset. Beside
 * the text (from about 760 px to 1023) the photo is two fifths of the row but as tall as the text, so the 16:9 file is
 * scaled to that height: 60vw covers it without a soft photo.
 */
const CARD_PHOTO_SIZES =
  "(min-width: 2112px) 624px, (min-width: 1371px) 33vw, (min-width: 1024px) 50vw, (min-width: 768px) 60vw, 100vw";

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
              <div className="in-posts">
                {posts.map((p, i) => (
                  <article key={p.slug} className="in-post">
                    <Link href={`/blog/${p.slug}`} className="in-post__ph" tabIndex={-1} aria-hidden="true">
                      {p.cover ? (
                        <Image
                          src={p.cover.src}
                          overrideSrc={p.cover.src}
                          alt={p.cover.alt}
                          width={COVER_WIDTH}
                          height={COVER_HEIGHT}
                          sizes={CARD_PHOTO_SIZES}
                          loading={i < 3 ? "eager" : "lazy"}
                          fetchPriority={i === 0 ? "high" : undefined}
                        />
                      ) : (
                        <span className="in-post__noimg">
                          <CameraIcon />
                        </span>
                      )}
                    </Link>
                    <div className="in-post__b">
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
                    </div>
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
