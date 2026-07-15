import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { Container, LinkButton } from "@/components/common";
import { InquiryButton } from "@/components/inquiry";
import { SiteFooter, SiteHeader } from "@/components/layout";
import { SITE_URL } from "@/constants";
import { getGoogleReviews, type GoogleReview } from "@/lib/google-reviews";
import { buildBreadcrumbJsonLd } from "@/lib/site-jsonld";

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
  openGraph: {
    title: "Отзиви за SelectAuto",
    description: "Какво казват клиентите за внос на автомобили със SelectAuto.",
    url: CANONICAL,
    type: "website",
  },
};

function Stars({ rating }: { rating: number }) {
  const full = Math.round(rating);
  return (
    <span aria-label={`${rating} от 5`} className="text-brand">
      {"★★★★★".slice(0, full)}
      <span className="text-line">{"★★★★★".slice(full)}</span>
    </span>
  );
}

function ReviewCard({ review }: { review: GoogleReview }) {
  return (
    <figure className="flex flex-col rounded-2xl border border-line bg-white p-5 shadow-card">
      <div className="mb-2 flex items-center justify-between gap-3">
        <figcaption className="font-extrabold text-ink">{review.author}</figcaption>
        {review.rating > 0 ? <Stars rating={review.rating} /> : null}
      </div>
      <blockquote className="text-sm/relaxed text-[#5a5d64]">{review.text}</blockquote>
      {review.relativeTime ? <p className="mt-3 text-xs text-muted">{review.relativeTime}</p> : null}
    </figure>
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
      <div className="rounded-2xl border border-line bg-white p-6 text-center shadow-card">
        <p className="mb-4 text-sm/relaxed text-[#5a5d64]">
          Вижте отзивите на нашите клиенти директно в Google — реални мнения за процеса на внос със SelectAuto.
        </p>
        {profile ? (
          <LinkButton
            href={profile}
            target="_blank"
            rel="noopener noreferrer"
            rippleTheme="dark"
            className="inline-flex min-h-12 items-center justify-center rounded-full border border-line bg-white px-6 text-sm font-extrabold uppercase tracking-wide text-brand-dark transition-transform duration-200 hover:-translate-y-0.5"
          >
            Виж отзивите в Google
          </LinkButton>
        ) : null}
      </div>
    );
  }

  return (
    <>
      {/* Aggregate (plain content — NOT AggregateRating schema, per policy) */}
      {data.rating != null && data.total != null ? (
        <div className="mb-6 flex flex-wrap items-center gap-3">
          <span className="text-3xl font-black text-ink">{data.rating.toFixed(1)}</span>
          <Stars rating={data.rating} />
          <span className="text-sm text-muted">
            {data.total.toLocaleString("bg-BG")} отзива в Google
          </span>
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {data.reviews.map((r) => (
          <ReviewCard key={`${r.author}-${r.text.slice(0, 24)}`} review={r} />
        ))}
      </div>

      <p className="mt-6 text-sm text-muted">
        Отзивите се зареждат от Google профила на SelectAuto.
      </p>
    </>
  );
}

function ReviewsSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="h-36 w-full animate-pulse rounded-2xl bg-line" />
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
      <main className="flex-1 bg-[#fafafa] pt-(--header-h) text-ink">
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />

        <Container className="max-w-245 py-12 max-md:py-8">
          <nav className="mb-5 text-sm text-muted">
            <Link href="/" className="hover:text-brand-dark">
              Начало
            </Link>
            <span className="px-2">/</span>
            <span className="text-ink">Отзиви</span>
          </nav>

          <h1 className="mb-3 text-4xl font-black uppercase tracking-tight text-ink max-md:text-3xl">Отзиви</h1>
          <p className="mb-8 max-w-2xl text-[15px] leading-[1.8] text-[#3d4046]">
            Какво казват клиентите на SelectAuto за внос на автомобили от Корея, САЩ и Канада. Реални мнения за
            прозрачността, коректността и съдействието през целия процес — от избора до регистрацията в КАТ.
          </p>

          <section className="mb-12">
            <Suspense fallback={<ReviewsSkeleton />}>
              <ReviewsSection />
            </Suspense>
          </section>

          {/* CTA */}
          <section className="rounded-card bg-linear-to-r from-brand-dark to-brand p-8 text-center max-md:p-6">
            <h2 className="mb-2 text-2xl font-black text-white max-md:text-xl">Готов ли си за своя автомобил?</h2>
            <p className="mx-auto mb-5 max-w-xl text-sm/relaxed text-white/85">
              Присъедини се към доволните клиенти на SelectAuto. Кажи ни марка, модел и бюджет — ще подберем подходящ
              автомобил и ще поемем целия внос.
            </p>
            <InquiryButton
              rippleTheme="dark"
              className="inline-flex min-h-13.5 items-center justify-center rounded-full bg-white px-8 text-sm font-extrabold uppercase tracking-wide text-brand-dark transition-transform duration-200 hover:-translate-y-0.5"
            >
              Направи запитване
            </InquiryButton>
          </section>
        </Container>
      </main>
      <SiteFooter />
    </>
  );
}
