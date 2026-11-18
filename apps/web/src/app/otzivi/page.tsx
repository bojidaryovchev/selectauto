import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { GoogleIcon, StarIcon } from "@/components/icons";
import { InquiryButton } from "@/components/inquiry";
import { SiteFooter, SiteHeader } from "@/components/layout";
import { SITE_URL } from "@/constants";
import { bgDecimal } from "@/data/import-rates";
import { getGoogleReviews, type GoogleReview } from "@/lib/google-reviews";
import { buildBreadcrumbJsonLd } from "@/lib/site-jsonld";
import { buildSocialMeta } from "@/lib/social-meta";

/**
 * /otzivi — customer reviews (docs/12-web-seo-strategy.md §4.2). Real Google reviews are
 * pulled live via the Places API (`lib/google-reviews.ts`, cached daily) and shown
 * as CONTENT — great for trust + AI-citation/GEO.
 *
 * ⚠️ NO Review/AggregateRating JSON-LD. Per Google's (Dec 2025) self-serving policy,
 * a business marking up its OWN Google reviews (LocalBusiness/Organization) is
 * ineligible for star rich results and risks a manual action. So we display the
 * reviews and the rating as plain content, and emit only BreadcrumbList schema. The
 * site-wide AutoDealer node (layout) stays clean of aggregateRating for the same
 * reason. Sources: Google Search Central review-snippet docs; BrightLocal.
 *
 * Server component; the reviews stream in a <Suspense> boundary (the Places fetch
 * is cached but still request-time data under Cache Components). Until
 * GOOGLE_PLACES_API_KEY / GOOGLE_PLACES_ID are set, the fetch returns null and the
 * page shows a graceful fallback (trust content + a link to the Google profile).
 *
 * Look: boards `in-otzivi` (today's fallback), `in-otzivi-google` (with reviews) and `in-otzivi-flow` (loading, the
 * profile link, no aggregate); classes in styles/info-otzivi.css under the page's root class `.in-otzivi-pg`; parity
 * check docs/design/parity/otzivi.md.
 */

const PATH = "/otzivi";
const CANONICAL = `${SITE_URL}${PATH}`;

/** The public Google profile (reviews view), built from the configured Place ID —
 *  link-out for "see all / leave a review". Null until GOOGLE_PLACES_ID is set. */
function googleProfileUrl(): string | null {
  const placeId = process.env.GOOGLE_PLACES_ID;
  return placeId ? `https://www.google.com/maps/place/?q=place_id:${encodeURIComponent(placeId)}` : null;
}

export const metadata: Metadata = {
  title: "Отзиви — какво казват клиентите | SelectAuto",
  description:
    "Реални отзиви от клиенти на SelectAuto за внос на автомобили от Корея, САЩ и Канада — прозрачност, коректност и съдействие през целия процес до регистрация в КАТ.",
  alternates: { canonical: CANONICAL },
  ...buildSocialMeta({
    title: "Отзиви за SelectAuto",
    description: "Какво казват клиентите за внос на автомобили със SelectAuto.",
    path: PATH,
  }),
};

/** The stars of a rating: filled up to the rounded rating, the rest dim. The rating reads with a decimal comma. */
function Stars({ rating }: { rating: number }) {
  const full = Math.round(rating);
  return (
    <span aria-label={`${bgDecimal(rating)} от 5`} className="in-stars">
      {Array.from({ length: 5 }, (_, i) => (
        <StarIcon key={i} className={i < full ? "text-tx" : undefined} />
      ))}
    </span>
  );
}

function ReviewCard({ review }: { review: GoogleReview }) {
  return (
    <figure className="sa-pnl in-rev">
      <div className="in-rev__h">
        <figcaption className="font-extrabold">{review.author}</figcaption>
        {review.rating > 0 ? <Stars rating={review.rating} /> : null}
      </div>
      <blockquote className="type-body text-tx2">{review.text}</blockquote>
      {review.relativeTime ? <p className="sa-small">{review.relativeTime}</p> : null}
    </figure>
  );
}

/** The call to action: beside the Google panel while there are no reviews, a row under the reviews otherwise. */
function ReviewsCta({ row = false }: { row?: boolean }) {
  return (
    <div
      className={`sa-pnl in-cta ${row ? "mt-14 flex-row flex-wrap items-center justify-between gap-x-12 gap-y-6 p-10" : ""}`}
    >
      <div className={row ? "in-cta__t" : "contents"}>
        <h2 className="type-h2">Готови ли сте за своя автомобил?</h2>
        <p className="sa-p">
          Присъединете се към доволните клиенти на SelectAuto. Кажете ни марка, модел и бюджет — ще подберем подходящ
          автомобил и ще поемем целия внос.
        </p>
      </div>
      <InquiryButton variant="pri" size="xl">
        Направете запитване
      </InquiryButton>
    </div>
  );
}

/** Streams the real reviews; renders the graceful fallback if the API isn't
 *  configured/available yet. */
async function ReviewsSection() {
  const data = await getGoogleReviews();

  if (!data || data.reviews.length === 0) {
    // Fallback until the Places key is set (or if the API is unavailable).
    const profile = googleProfileUrl();
    return (
      <div className="in-rv">
        <div className="sa-pnl in-gfb">
          <span className="in-gfb__ic">
            <GoogleIcon />
          </span>
          <p>Вижте отзивите на нашите клиенти директно в Google — реални мнения за процеса на внос със SelectAuto.</p>
          {profile ? (
            <a href={profile} target="_blank" rel="noopener noreferrer" className="sa-btn sa-btn--sec">
              Вижте отзивите в Google
            </a>
          ) : null}
        </div>
        <ReviewsCta />
      </div>
    );
  }

  return (
    <>
      {/* Aggregate (plain content — NOT AggregateRating schema, per policy) */}
      {data.rating != null && data.total != null ? (
        <div className="in-agg">
          <b className="font-display text-[26px] leading-none font-bold">{data.rating.toFixed(1).replace(".", ",")}</b>
          <Stars rating={data.rating} />
          <span className="sa-small">{data.total.toLocaleString("bg-BG")} отзива в Google</span>
        </div>
      ) : null}

      <div className="in-revs max-sm:grid-cols-1">
        {data.reviews.map((r) => (
          <ReviewCard key={`${r.author}-${r.text.slice(0, 24)}`} review={r} />
        ))}
      </div>

      <p className="in-note">Отзивите се зареждат от Google профила на SelectAuto.</p>

      <ReviewsCta row />
    </>
  );
}

/** While the reviews load: four placeholder blocks. */
function ReviewsSkeleton() {
  return (
    <div className="in-revs max-sm:grid-cols-1" aria-busy="true" aria-label="Зареждане">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="sa-sk h-36 rounded-lg" />
      ))}
    </div>
  );
}

export default function ReviewsPage() {
  const breadcrumbJsonLd = buildBreadcrumbJsonLd([
    { name: "Начало", url: "/" },
    { name: "Отзиви", url: PATH },
  ]);

  return (
    <>
      <SiteHeader />
      <main className="in-otzivi-pg flex-1 pt-(--header-h)">
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />

        <section className="in-head">
          <div className="sa-wrap in-head__in">
            <nav className="sa-crumbs" aria-label="Пътечка">
              <Link href="/">Начало</Link>
              <i aria-hidden="true">/</i>
              <span aria-current="page">Отзиви</span>
            </nav>
            <h1 className="type-h1">Отзиви</h1>
            <p className="sa-lead max-w-[72ch]">
              Какво казват клиентите на SelectAuto за внос на автомобили от Корея, САЩ и Канада. Реални мнения за
              прозрачността, коректността и съдействието през целия процес — от избора до регистрацията в КАТ.
            </p>
          </div>
        </section>

        <section className="sa-band">
          <div className="sa-wrap">
            <Suspense fallback={<ReviewsSkeleton />}>
              <ReviewsSection />
            </Suspense>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
