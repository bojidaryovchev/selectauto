import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Container, LinkButton } from "@/components/common";
import {
  CarContactPanel,
  CarGallery,
  CarHighlights,
  CarPricePanel,
  CarSpecSheet,
  RelatedCars,
} from "@/components/cars/car-detail";
import { AuctionCountdown } from "@/components/cars/all-cars";
import { SiteFooter, SiteHeader } from "@/components/layout";
import { buildCarJsonLd } from "@/lib/car-detail-jsonld";
import { getCarDetail } from "@/queries/cars";

type Params = Promise<{ id: string }>;

const SITE_URL = "https://selectauto.bg";

/** Parse the `[id]` route param to a positive integer car id (else NaN). */
function parseId(raw: string): number {
  const n = Number(raw);
  return Number.isInteger(n) && n > 0 ? n : NaN;
}

/**
 * Per-car metadata. Active cars are fully indexable with a descriptive title +
 * canonical. Concluded/sold cars are `noindex, follow` — a per-lot page over a
 * dead listing is exactly the thin/decaying content Google penalizes at scale
 * (same stance as the past catalog view). The Vehicle/Product JSON-LD is emitted
 * in the page body (only for indexable active cars — see `buildCarJsonLd`).
 */
export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const id = parseId((await params).id);
  if (Number.isNaN(id)) return { title: "Автомобил | SelectAuto" };

  const payload = await getCarDetail(id);
  if (!payload) return { title: "Автомобил | SelectAuto", robots: { index: false, follow: true } };

  const { detail } = payload;
  const canonical = `${SITE_URL}/avtomobil/${id}`;
  const priceStr = detail.prices.find((p) => p.primary)?.value;

  const descBits = [
    detail.source,
    detail.highlights.find((h) => h.label === "Пробег")?.value,
    detail.specs.find((sp) => sp.label === "Първична щета")?.value,
    priceStr,
  ].filter(Boolean);

  return {
    title: `${detail.title} | SelectAuto`,
    description: `${detail.title} — внос от ${detail.source}. ${descBits.join(" · ")}. Свържи се със SelectAuto за оферта и внос.`,
    alternates: { canonical },
    robots: detail.isPast ? { index: false, follow: true } : undefined,
    openGraph: {
      title: detail.title,
      url: canonical,
      type: "website",
      images: detail.images.length > 0 ? [detail.images[0]] : undefined,
    },
  };
}

/**
 * /avtomobil/[id] — the single-car detail page. A static shell (header/footer)
 * renders immediately; the data-dependent body streams inside a `<Suspense>`
 * boundary (required by PPR / Cache Components — `params` is uncached request data,
 * so awaiting it at the page root blocks the whole route and the build rejects it;
 * the catalog page suspends its grid the same way).
 *
 * 404 handling: `notFound()` runs inside the suspended body, so a missing/invalid
 * id renders the not-found UI AFTER the shell has begun streaming (HTTP 200 with a
 * 404 body — an inherent PPR trade-off). `notFound()` still injects `noindex`, so
 * such a URL is never indexed — the SEO-critical part. A true 404 status would
 * require giving up the static shell, which isn't worth it here.
 */
export default function CarDetailPage({ params }: { params: Params }) {
  return (
    <>
      <SiteHeader />
      <main className="flex-1 bg-[#fafafa] pt-(--header-h) text-ink">
        <Suspense fallback={<CarDetailSkeleton />}>
          <CarDetailBody params={params} />
        </Suspense>
      </main>
      <SiteFooter />
    </>
  );
}

/**
 * The async body: awaits the route param + the cached detail payload, then renders
 * the two-column layout. Data is `getCarDetail` (active → archived fallback): a
 * concluded car still resolves and renders as a past result (no CTAs, noindexed).
 */
async function CarDetailBody({ params }: { params: Params }) {
  const id = parseId((await params).id);
  if (Number.isNaN(id)) notFound();

  const payload = await getCarDetail(id);
  if (!payload) notFound();

  const { detail, related } = payload;
  const jsonLd = buildCarJsonLd(detail, `${SITE_URL}/avtomobil/${id}`);

  return (
    <>
      {jsonLd ? (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      ) : null}

      <Container>
        <div className="py-8 max-md:py-6">
            {/* Breadcrumb */}
            <nav className="mb-5 text-sm text-muted">
              <Link href="/vsichki-avtomobili/" className="hover:text-brand-dark">
                Всички автомобили
              </Link>
              <span className="px-2">/</span>
              <span className="text-ink">{detail.title}</span>
            </nav>

            <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)]">
              {/* ── Left column: gallery + heading + specs ── */}
              <div className="flex flex-col gap-6">
                <CarGallery images={detail.images} alt={detail.title} />

                <div>
                  <div className="mb-3 flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center rounded-full bg-[#163b66] px-3 py-1 text-[11px] font-black uppercase tracking-[0.05em] text-white">
                      {detail.source}
                    </span>
                    {detail.isPast ? (
                      <span className="inline-flex items-center rounded-full bg-[#3a3f47] px-3 py-1 text-[11px] font-black uppercase tracking-[0.05em] text-white">
                        ПРОДАДЕН
                      </span>
                    ) : detail.hasBuyNow ? (
                      <span className="inline-flex items-center rounded-full bg-gradient-to-r from-brand-dark to-brand px-3 py-1 text-[11px] font-black uppercase tracking-[0.05em] text-white">
                        BUY NOW
                      </span>
                    ) : null}
                    {detail.lotNumber ? (
                      <span className="text-[13px] font-semibold text-muted">Лот № {detail.lotNumber}</span>
                    ) : null}
                  </div>

                  <h1 className="mb-4 text-3xl font-black uppercase leading-tight text-[#153f6b] max-md:text-2xl">
                    {detail.title}
                  </h1>

                  <CarHighlights highlights={detail.highlights} />
                </div>

                {/* Spec sheet (desktop reads it here under the heading) */}
                <CarSpecSheet specs={detail.specs} />
              </div>

              {/* ── Right column: price + status + contact (sticky) ── */}
              <aside className="flex flex-col gap-5 lg:sticky lg:top-6 lg:self-start">
                {/* Status / countdown strip. Past: static result pill. Active:
                    AuctionCountdown owns the row (live countdown only for a genuinely
                    future sale date, else the real status — never a false "Приключил"
                    for a lapsed-but-still-active upstream lot). */}
                <div className="flex items-center justify-between gap-2 rounded-2xl bg-[#2f343c] px-5 py-3">
                  {detail.isPast ? (
                    <>
                      <span className="text-[11px] font-semibold uppercase tracking-wide text-white/55">Статус</span>
                      <span className="text-sm font-bold text-white/90">{detail.status ?? "—"}</span>
                    </>
                  ) : (
                    <AuctionCountdown saleDate={detail.saleDate} status={detail.status} />
                  )}
                </div>

                <CarPricePanel prices={detail.prices} />

                {detail.location ? (
                  <div className="rounded-2xl border border-line bg-white px-5 py-4 shadow-card">
                    <span className="block text-[11px] font-semibold uppercase tracking-wide text-muted">
                      Локация
                    </span>
                    <span className="text-sm font-bold text-ink">{detail.location}</span>
                  </div>
                ) : null}

                {detail.isPast ? (
                  <LinkButton
                    href="/vsichki-avtomobili/"
                    rippleTheme="dark"
                    className="inline-flex min-h-[52px] w-full items-center justify-center rounded-full border border-line bg-white px-5 text-sm font-extrabold uppercase tracking-wide text-[#333] transition-transform duration-200 hover:-translate-y-0.5 hover:text-brand-dark"
                  >
                    Виж активни обяви
                  </LinkButton>
                ) : (
                  <CarContactPanel title={detail.title} />
                )}
              </aside>
            </div>

            <RelatedCars cars={related} />
          </div>
        </Container>
    </>
  );
}

/** Lightweight placeholder shown while the detail body streams in. */
function CarDetailSkeleton() {
  return (
    <Container>
      <div className="py-8 max-md:py-6">
        <div className="mb-5 h-4 w-64 animate-pulse rounded bg-line" />
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)]">
          <div className="flex flex-col gap-6">
            <div className="aspect-[4/3] w-full animate-pulse rounded-2xl bg-line" />
            <div className="h-8 w-3/4 animate-pulse rounded bg-line" />
            <div className="h-40 w-full animate-pulse rounded-2xl bg-line" />
          </div>
          <div className="flex flex-col gap-5">
            <div className="h-12 w-full animate-pulse rounded-2xl bg-line" />
            <div className="h-28 w-full animate-pulse rounded-2xl bg-line" />
            <div className="h-48 w-full animate-pulse rounded-2xl bg-line" />
          </div>
        </div>
      </div>
    </Container>
  );
}
