import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Container, LinkButton } from "@/components/common";
import { AlertIcon } from "@/components/icons";
import {
  CarContactPanel,
  CarFactoryOptions,
  CarGallery,
  CarHighlights,
  CarHistoryTimeline,
  CarIaaScore,
  CarInspection,
  CarInsuranceSummary,
  CarLocationMap,
  CarMediaStrip,
  CarPricePanel,
  CarSellerNote,
  CarSpecSheet,
  CarTagChips,
  CarVinCheck,
  RelatedCars,
} from "@/components/cars/car-detail";
import { AuctionCountdown } from "@/components/cars/all-cars";
import { FavoriteButton } from "@/components/cars/favorite-button";
import { CarImportCalculator } from "@/components/calculator";
import { SiteFooter, SiteHeader } from "@/components/layout";
import { SITE_URL } from "@/constants";
import type { MarketId, UsAuction, VehicleType } from "@/data/import-rates";
import { buildCarJsonLd } from "@/lib/car-detail-jsonld";
import { modelHubPath } from "@/lib/car-slug";
import { buildBreadcrumbJsonLd, type Breadcrumb } from "@/lib/site-jsonld";
import { buildSocialMeta } from "@/lib/social-meta";
import { getCarDetail } from "@/queries/cars";

type Params = Promise<{ id: string }>;

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

  // Enriched title: price + „внос от {държава}" out-informs the field's uniformly
  // thin listing titles ("2018 BMW X5 - Brand") — a snippet-CTR edge at catalog
  // scale (docs/13-seo-action-plan.md Phase A). Price only for ACTIVE cars — a
  // sold price in the title of a noindexed page would only mislead sharers.
  // Country only when the mapper could state it confidently (see sourceCountry).
  const titleBits = [
    !detail.isPast && priceStr ? priceStr : null,
    detail.sourceCountry ? `внос от ${detail.sourceCountry}` : null,
  ].filter(Boolean);
  const title =
    titleBits.length > 0
      ? `${detail.title} — ${titleBits.join(", ")} | SelectAuto`
      : `${detail.title} | SelectAuto`;

  // Source is NOT repeated in descBits (the lead phrase already names it), and a
  // sold car's realized price is labeled „Продаден за" — never presented as a
  // live offer (the page is noindex but shareable, and social scrapers read this).
  const descBits = [
    detail.highlights.find((h) => h.label === "Пробег")?.value,
    detail.specs.find((sp) => sp.label === "Първична щета")?.value,
    priceStr ? (detail.isPast ? `Продаден за ${priceStr}` : priceStr) : null,
  ].filter(Boolean);
  const descCta = detail.isPast
    ? "Автомобилът е продаден — виж активните обяви на SelectAuto."
    : "Свържи се със SelectAuto за оферта и внос.";

  const description = `${detail.title} — внос от ${detail.sourceCountry ? `${detail.sourceCountry} (${detail.source})` : detail.source}. ${descBits.join(" · ")}. ${descCta}`;

  return {
    title,
    description,
    alternates: { canonical },
    robots: detail.isPast ? { index: false, follow: true } : undefined,
    // OG uses the plain car title + its own description + the first photo as the
    // share image (falls back to the site image when the car has none). Routed
    // through the shared builder so siteName/locale/twitter aren't dropped.
    ...buildSocialMeta({
      title: detail.title,
      description,
      path: `/avtomobil/${id}`,
      image: detail.images.length > 0 ? detail.images[0] : undefined,
    }),
  };
}

/**
 * /avtomobil/[id] — the single-car detail page. The static shell (skeleton main +
 * footer) renders immediately; the data-dependent body streams inside a
 * `<Suspense>` boundary (required by PPR / Cache Components — `params` is uncached
 * request data, so awaiting it at the page root blocks the whole route and the
 * build rejects it; the catalog page suspends its grid the same way).
 *
 * The HEADER gets its own boundary: `SiteHeader` (and its `MobileBottomNav`) read
 * `usePathname()` for active-nav state, and on a dynamic-param route the pathname
 * is unknown while the fallback shell prerenders — rendering it unwrapped fails
 * the build with "Uncached data was accessed outside of <Suspense>" (same
 * constraint the root layout documents for `<ScrollToTop>`; static routes are
 * unaffected because their pathname is known at build time). It has no data
 * reads, so at request time it streams in the first flush — effectively instant.
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
      <Suspense fallback={null}>
        <SiteHeader />
      </Suspense>
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

  // Model-hub crumb — the contextual internal link INTO the SEO hub
  // (`/avtomobili/marka/{make}/{model}`). Inserted only when the car has resolvable
  // brand+model names (so the target hub URL actually resolves). This is the
  // highest-value hub link: it flows authority from every car-detail page into the
  // relevant hub and mirrors the JSON-LD trail. `label` is the make+model, or a
  // trimmed title fallback.
  const hubHref = modelHubPath(detail.brand, detail.model);
  const hubLabel = detail.brand && detail.model ? `${detail.brand} ${detail.model}` : null;

  // Deep-link for the concluded car's "Виж активни обяви" CTA → the catalog
  // pre-filtered to this exact make (+ model). Uses the manufacturer/model
  // external ids the catalog `?brand=&model=` params expect (model is brand-scoped,
  // so only add it alongside brand). Falls back to the unfiltered catalog when the
  // ids are missing.
  const activeCatalogHref = (() => {
    if (detail.brandExternalId == null) return "/vsichki-avtomobili";
    const p = new URLSearchParams({ brand: String(detail.brandExternalId) });
    if (detail.modelExternalId != null) p.set("model", String(detail.modelExternalId));
    return `/vsichki-avtomobili?${p.toString()}`;
  })();

  // „Калкулирай вноса" seed for the per-listing calculator dialog (landed-cost
  // transparency — docs/13-seo-action-plan.md Phase B). Market maps kr → kr;
  // US-market lots split us/ca by the mapper's sourceCountry (Copart/IAAI run
  // branches in both); unknown → no market param (calculator default). Shown for
  // EVERY active car — most US/CA auction lots have no bid yet (no primary price
  // row), but the dialog's price field is an editable input, so the buyer types
  // the bid they plan to win at. When the listing does carry a primary price
  // (USD, "16 743 $" — the calculator is USD end-to-end) it pre-seeds the field.
  // Past cars only excluded — a sold car's price isn't an input.
  const calcSeed: {
    priceUsd?: number;
    market?: MarketId;
    vehicleType?: VehicleType;
    auction?: UsAuction;
    usLocation?: { zip?: string; city?: string; state?: string };
  } | null = (() => {
    if (detail.isPast) return null;
    const priceDigits = detail.prices.find((p) => p.primary)?.value.replace(/[^\d]/g, "");
    const amountUsd = Number(priceDigits);
    const market: MarketId | undefined =
      detail.market === "kr"
        ? "kr"
        : detail.sourceCountry === "Канада"
          ? "ca"
          : detail.market === "us"
            ? "us"
            : undefined;
    return {
      priceUsd: Number.isFinite(amountUsd) && amountUsd > 0 ? Math.round(amountUsd) : undefined,
      market,
      vehicleType: detail.calcVehicleType,
      auction: detail.calcAuction,
      usLocation: detail.calcUsLocation,
    };
  })();

  // Breadcrumb matching the visible nav EXACTLY (Catalog → [model hub] → this
  // car — the visible trail has no „Начало" crumb, so none is marked up).
  // Emitted for both active and past cars (a breadcrumb is fine on a noindexed page —
  // it just won't surface; harmless and keeps the trail consistent).
  const crumbs: Breadcrumb[] = [
    { name: "Всички автомобили", url: "/vsichki-avtomobili" },
    ...(hubHref && hubLabel ? [{ name: hubLabel, url: hubHref }] : []),
    { name: detail.title, url: `/avtomobil/${id}` },
  ];
  const breadcrumbJsonLd = buildBreadcrumbJsonLd(crumbs);

  return (
    <>
      {jsonLd ? (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      ) : null}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />

      <Container>
        <div className="py-8 max-md:py-6">
            {/* Breadcrumb (Home → Catalog → [model hub] → this car). The model-hub
                link is shown only when it resolves — see `hubHref` above. */}
            <nav className="mb-5 text-sm text-muted">
              <Link href="/vsichki-avtomobili" className="hover:text-brand-dark">
                Всички автомобили
              </Link>
              {hubHref && hubLabel ? (
                <>
                  <span className="px-2">/</span>
                  <Link href={hubHref} className="hover:text-brand-dark">
                    {hubLabel}
                  </Link>
                </>
              ) : null}
              <span className="px-2">/</span>
              <span className="text-ink">{detail.title}</span>
            </nav>

            <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)]">
              {/* ── Left column: gallery + heading + specs ── */}
              <div className="flex flex-col gap-6">
                <div className="flex flex-col gap-3">
                  <CarGallery images={detail.images} alt={detail.title} />
                  {detail.media ? <CarMediaStrip media={detail.media} /> : null}
                </div>

                <div>
                  <div className="mb-3 flex flex-wrap items-center gap-2">
                    {detail.brandLogo ? (
                      // Brand logo (SVG on auctionsapi.com). Plain <img> — next/image
                      // blocks SVG without dangerouslyAllowSVG; this is a small mark.
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={detail.brandLogo}
                        alt={detail.brand ? `${detail.brand} лого` : ""}
                        width={28}
                        height={28}
                        className="inline-flex size-7 items-center justify-center rounded-full bg-white p-1 shadow-card ring-1 ring-line"
                      />
                    ) : null}
                    <span className="inline-flex items-center rounded-full bg-[#163b66] px-3 py-1 text-[11px] font-black uppercase tracking-wider text-white">
                      {detail.source}
                    </span>
                    {detail.isPast ? (
                      <span className="inline-flex items-center rounded-full bg-[#3a3f47] px-3 py-1 text-[11px] font-black uppercase tracking-wider text-white">
                        ПРОДАДЕН
                      </span>
                    ) : detail.hasBuyNow ? (
                      <span className="inline-flex items-center rounded-full bg-linear-to-r from-brand-dark to-brand px-3 py-1 text-[11px] font-black uppercase tracking-wider text-white">
                        BUY NOW
                      </span>
                    ) : null}
                    {detail.lotNumber ? (
                      <span className="text-[13px] font-semibold text-muted">Лот № {detail.lotNumber}</span>
                    ) : null}
                  </div>

                  <div className="mb-4 flex items-start justify-between gap-4">
                    <h1 className="text-3xl/tight font-black uppercase text-[#153f6b] max-md:text-2xl">
                      {detail.title}
                    </h1>
                    {/* Favourite toggle — solid style to sit on the light page.
                        Past/sold cars can still be saved for price research. */}
                    <div className="shrink-0">
                      <FavoriteButton carId={id} size="lg" variant="solid" />
                    </div>
                  </div>

                  <CarHighlights highlights={detail.highlights} />

                  {detail.odometerNotActual || detail.usageFlag ? (
                    <div className="mt-2.5 flex flex-wrap gap-2">
                      {detail.odometerNotActual ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-[#fff4e5] px-3.5 py-1.5 text-[13px] font-bold text-[#9a5b00] ring-1 ring-[#f5d9ac]">
                          <AlertIcon className="size-3.5" />
                          Непотвърден километраж
                        </span>
                      ) : null}
                      {detail.usageFlag ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-[#fff4e5] px-3.5 py-1.5 text-[13px] font-bold text-[#9a5b00] ring-1 ring-[#f5d9ac]">
                          <AlertIcon className="size-3.5" />
                          {detail.usageFlag}
                        </span>
                      ) : null}
                    </div>
                  ) : null}

                  {detail.usTags && detail.usTags.length > 0 ? (
                    <div className="mt-3">
                      <CarTagChips tags={detail.usTags} />
                    </div>
                  ) : null}
                </div>

                {/* IAA Vehicle Score meter (IAAI-only; self-hides otherwise).
                    `!= null` because 0 is a valid score (non-repairable). */}
                {detail.iaaScore != null ? <CarIaaScore value={detail.iaaScore} /> : null}

                {/* Spec sheet (desktop reads it here under the heading) */}
                <CarSpecSheet specs={detail.specs} />

                {/* Per-car VIN history check → Carfax lead funnel. Only when the car
                    carries a VIN (the `cars.vin` column is nullable; many lots have
                    none). Reuses the free /api/vin-check lookup, DB-cached per VIN. */}
                {detail.vin ? (
                  <CarVinCheck vin={detail.vin} make={detail.brand} model={detail.model} />
                ) : null}
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

                <CarPricePanel prices={detail.prices} liveBid={detail.liveBid} marketAvg={detail.marketAvg} />

                {/* Per-listing landed-cost transparency: a button that opens the
                    full import calculator in a dialog, pre-seeded with THIS car's
                    price + market + vehicle-type size class. */}
                {calcSeed ? (
                  <CarImportCalculator
                    defaultPrice={calcSeed.priceUsd}
                    defaultMarket={calcSeed.market}
                    defaultVehicleType={calcSeed.vehicleType}
                    defaultAuction={calcSeed.auction}
                    defaultUsLocation={calcSeed.usLocation}
                    carLabel={detail.title}
                    lotNumber={detail.lotNumber}
                  />
                ) : null}

                {detail.seller?.name || detail.seller?.logo ? (
                  <div className="flex items-center gap-3 rounded-2xl border border-line bg-white px-5 py-4 shadow-card">
                    {detail.seller.logo ? (
                      // Insurer/seller logo (IAAI). Plain <img>: remote logo, may be SVG.
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={detail.seller.logo}
                        alt={detail.seller.name ? `${detail.seller.name} лого` : ""}
                        className="h-8 w-auto max-w-24 object-contain"
                      />
                    ) : null}
                    <div>
                      <span className="block text-[11px] font-semibold uppercase tracking-wide text-muted">
                        Продавач
                      </span>
                      {detail.seller.name ? (
                        <span className="text-sm font-bold text-ink">{detail.seller.name}</span>
                      ) : null}
                    </div>
                  </div>
                ) : null}

                {detail.geo ? (
                  <CarLocationMap lat={detail.geo.lat} lng={detail.geo.lng} location={detail.location} />
                ) : detail.location ? (
                  <div className="rounded-2xl border border-line bg-white px-5 py-4 shadow-card">
                    <span className="block text-[11px] font-semibold uppercase tracking-wide text-muted">
                      Локация
                    </span>
                    <span className="text-sm font-bold text-ink">{detail.location}</span>
                  </div>
                ) : null}

                {detail.isPast ? (
                  <LinkButton
                    href={activeCatalogHref}
                    rippleTheme="dark"
                    className="inline-flex min-h-13 w-full items-center justify-center rounded-full border border-line bg-white px-5 text-sm font-extrabold uppercase tracking-wide text-[#333] transition-transform duration-200 hover:-translate-y-0.5 hover:text-brand-dark"
                  >
                    Виж активни обяви
                  </LinkButton>
                ) : (
                  <CarContactPanel
                    title={detail.title}
                    brand={detail.brand}
                    model={detail.model}
                    year={detail.year}
                    lotNumber={detail.lotNumber}
                    vin={detail.vin}
                    market={detail.market}
                  />
                )}
              </aside>
            </div>

            {/* ── ENCAR (Korea) retail sections — full-width, below the two-column
                summary. All data is parsed into the view-model in the mapper; each
                section self-hides when its block is absent (also true of archived
                ENCAR lots, whose details tree is stripped to price-only). ── */}
            {detail.market === "kr" &&
            (detail.inspection || detail.insurance || detail.factoryOptions || detail.history || detail.sellerNote) ? (
              <div className="mt-8 flex flex-col gap-6">
                {detail.inspection ? <CarInspection inspection={detail.inspection} /> : null}
                {detail.insurance ? <CarInsuranceSummary insurance={detail.insurance} /> : null}
                {detail.factoryOptions ? <CarFactoryOptions options={detail.factoryOptions} /> : null}
                {detail.history ? <CarHistoryTimeline history={detail.history} /> : null}
                {detail.sellerNote ? <CarSellerNote note={detail.sellerNote} /> : null}
              </div>
            ) : null}

            <RelatedCars cars={related} />
          </div>
        </Container>
    </>
  );
}

// Stable keys for the skeleton's repeated placeholders (no array-index keys).
const SKELETON_THUMBS = ["t1", "t2", "t3", "t4", "t5", "t6", "t7"];
const SKELETON_CHIPS = [
  { k: "chip-1", w: "w-24" },
  { k: "chip-2", w: "w-28" },
  { k: "chip-3", w: "w-20" },
  { k: "chip-4", w: "w-24" },
];
const SKELETON_RELATED = ["r1", "r2", "r3", "r4"];

/**
 * Placeholder shown while the detail body streams in — the single Suspense fallback
 * for the whole page body, so it mirrors the real layout end-to-end to keep the swap
 * near shift-free: breadcrumb → two columns (gallery + thumbnail strip + heading +
 * highlight chips + spec-sheet card | status strip + price panel + contact panel) →
 * the "Подобни автомобили" carousel row.
 *
 * The IAAI score card is deliberately NOT placeholdered: it's IAAI-scored-only, so a
 * block here would flash empty for the Copart/Encar/unscored majority.
 */
function CarDetailSkeleton() {
  return (
    <Container>
      <div className="py-8 max-md:py-6">
        {/* Breadcrumb */}
        <div className="mb-5 h-4 w-64 animate-pulse rounded-sm bg-line" />

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)]">
          {/* Left column: gallery + heading + spec sheet */}
          <div className="flex flex-col gap-6">
            {/* Gallery — main image + thumbnail strip */}
            <div className="flex flex-col gap-3">
              <div className="aspect-4/3 w-full animate-pulse rounded-2xl bg-line" />
              <div className="flex gap-2 overflow-hidden">
                {SKELETON_THUMBS.map((k) => (
                  <div key={k} className="aspect-4/3 w-22 shrink-0 animate-pulse rounded-lg bg-line" />
                ))}
              </div>
            </div>

            {/* Heading — title + highlight chips */}
            <div className="flex flex-col gap-3">
              <div className="h-8 w-3/4 animate-pulse rounded-sm bg-line" />
              <div className="flex flex-wrap gap-2.5">
                {SKELETON_CHIPS.map(({ k, w }) => (
                  <div key={k} className={`h-8 ${w} animate-pulse rounded-full bg-line`} />
                ))}
              </div>
            </div>

            {/* Spec-sheet card */}
            <div className="h-72 w-full animate-pulse rounded-2xl bg-line" />
          </div>

          {/* Right column: status strip + price panel + contact panel */}
          <div className="flex flex-col gap-5">
            <div className="h-12 w-full animate-pulse rounded-2xl bg-line" />
            <div className="h-40 w-full animate-pulse rounded-2xl bg-line" />
            <div className="h-60 w-full animate-pulse rounded-2xl bg-line" />
          </div>
        </div>

        {/* Related cars ("Подобни автомобили") — heading + a peeking carousel row */}
        <div className="mt-12">
          <div className="mb-5 h-7 w-56 animate-pulse rounded-sm bg-line" />
          <div className="flex gap-5 overflow-hidden">
            {SKELETON_RELATED.map((k) => (
              <div
                key={k}
                className="h-72 w-[70%] shrink-0 animate-pulse rounded-2xl bg-line sm:w-[45%] lg:w-[30%]"
              />
            ))}
          </div>
        </div>
      </div>
    </Container>
  );
}
