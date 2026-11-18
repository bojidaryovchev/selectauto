import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { LinkButton, MakePlate } from "@/components/common";
import { TriangleAlertIcon } from "@/components/icons";
import {
  CONTACT_PANEL_ID,
  CarActionBar,
  CarContactPanel,
  CarFactoryOptions,
  CarGallery,
  CarHighlights,
  CarHistoryTimeline,
  CarIaaScore,
  CarInspection,
  CarInsuranceSummary,
  CarMediaStrip,
  CarPricePanel,
  CarSellerLocation,
  CarSellerNote,
  CarSpecSheet,
  CarTagChips,
  CarVinCheck,
  ENCAR_HISTORY_ID,
  RelatedCars,
  carInquiryPrefill,
  hasInspectionData,
  hasInsuranceSignal,
} from "@/components/cars/car-detail";
import { AuctionCountdown, SkeletonCard, StatusValue } from "@/components/cars/all-cars";
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
  // A malformed or unknown id → the 404 page with status 404. Metadata blocks the response (`htmlLimitedBots` in
  // next.config.ts), so nothing has been sent yet; from the body alone it streamed after a 200, a soft 404.
  // `getCarDetail` returns null only for a car that doesn't exist or is de-indexed; a database error throws instead.
  if (Number.isNaN(id)) notFound();

  const payload = await getCarDetail(id);
  if (!payload) notFound();

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
    priceStr ? (detail.isPast ? `${detail.isUnsold ? "Последна оферта" : "Продаден за"} ${priceStr}` : priceStr) : null,
  ].filter(Boolean);
  // An unsold lot says so: „Продаден" beside its status „Непродаден" contradicted itself (REDESIGN.md bug list).
  const descCta = detail.isUnsold
    ? "Търгът е приключил без продажба — вижте активните обяви на SelectAuto."
    : detail.isPast
      ? "Автомобилът е продаден — вижте активните обяви на SelectAuto."
      : "Свържете се със SelectAuto за оферта и внос.";

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

/** The past car's „Вижте активни обяви" in the buy box: the phone action bar hides while it is on screen. */
const PAST_CTA_ID = "car-past-cta";

/**
 * A current bid under this many dollars seeds the calculator as no bid (owner decision 16): a token opening bid
 * („Текуща цена 25 $") would quote a landed cost nobody can buy at, so the dialog starts at its 15 000 $ default.
 */
const MIN_BID_SEED_USD = 500;

/**
 * /avtomobil/[id] — the single-car detail page (boards `cd-*`; parity check docs/design/parity/avtomobil.md). The
 * static shell (skeleton + footer) renders immediately; the data-dependent body streams inside a `<Suspense>` boundary
 * (required by PPR / Cache Components — `params` is uncached request data, so awaiting it at the page root blocks the
 * whole route and the build rejects it; the catalog page suspends its grid the same way).
 *
 * The HEADER gets its own boundary: `SiteHeader` (and its `MobileBottomNav`) read `usePathname()` for active-nav
 * state, and on a dynamic-param route the pathname is unknown while the fallback shell prerenders — rendering it
 * unwrapped fails the build with "Uncached data was accessed outside of <Suspense>" (same constraint the root layout
 * documents for `<ScrollToTop>`; static routes are unaffected because their pathname is known at build time). It has
 * no data reads, so at request time it streams in the first flush — effectively instant.
 *
 * 404 handling: `generateMetadata` calls `notFound()` for a missing/invalid id. Metadata blocks the response
 * (`htmlLimitedBots`), so that happens before the shell is sent and the 404 page goes out with status 404. The body
 * keeps its own check, which on its own could only render the 404 after a 200 had gone out (a soft 404).
 */
export default function CarDetailPage({ params }: { params: Params }) {
  return (
    <>
      <Suspense fallback={null}>
        <SiteHeader />
      </Suspense>
      <main className="flex-1 pt-(--header-h)">
        <Suspense fallback={<CarDetailSkeleton />}>
          <CarDetailBody params={params} />
        </Suspense>
      </main>
      <SiteFooter />
      {/* Room for the phone action bar at the page's end, so the footer's last lines clear it (hidden from 1024 px,
          with the bar). */}
      <div className="cd-barsp" aria-hidden="true" />
    </>
  );
}

/**
 * The async body: awaits the route param + the cached detail payload, then renders the layout drawn on the boards:
 *
 * - from 1024 px, the gallery on the left and, on the right, the identity and a sticky buy box (status, price,
 *   calculator, contact); the details (IAA score, specs, VIN check, seller and location, the Korean sections) run in
 *   the left column beside the sticky box; related cars full width;
 * - tablet: one column, the price and the contact panel side by side;
 * - phone: the gallery full bleed, identity, status, price, calculator, the details, then the contact panel, and the
 *   action bar above the tabs.
 *
 * The reordering is CSS only (styles/car-page.css, `.cd-grid` with `display: contents` on the side column below
 * 1024 px), so the reading order in the DOM stays the desktop one.
 *
 * Data is `getCarDetail` (active → archived fallback): a concluded car still resolves and renders as a past result
 * (no CTAs, noindexed).
 */
async function CarDetailBody({ params }: { params: Params }) {
  const id = parseId((await params).id);
  if (Number.isNaN(id)) notFound();

  const payload = await getCarDetail(id);
  if (!payload) notFound();

  const { detail, related } = payload;
  const jsonLd = buildCarJsonLd(detail, `${SITE_URL}/avtomobil/${id}`);
  const primaryPrice = detail.prices.find((p) => p.primary);

  // Model-hub crumb — the contextual internal link INTO the SEO hub (`/avtomobili/marka/{make}/{model}`). Inserted
  // only when the car has resolvable brand+model names (so the target hub URL actually resolves). This is the
  // highest-value hub link: it flows authority from every car-detail page into the relevant hub and mirrors the
  // JSON-LD trail. `label` is the make+model.
  const hubHref = modelHubPath(detail.brand, detail.model);
  const hubLabel = detail.brand && detail.model ? `${detail.brand} ${detail.model}` : null;

  // Deep-link for the concluded car's „Вижте активни обяви" → the catalog pre-filtered to this exact make (+ model).
  // Uses the manufacturer/model external ids the catalog `?brand=&model=` params expect (model is brand-scoped, so
  // only add it alongside brand). Falls back to the unfiltered catalog when the ids are missing.
  const activeCatalogHref = (() => {
    if (detail.brandExternalId == null) return "/vsichki-avtomobili";
    const p = new URLSearchParams({ brand: String(detail.brandExternalId) });
    if (detail.modelExternalId != null) p.set("model", String(detail.modelExternalId));
    return `/vsichki-avtomobili?${p.toString()}`;
  })();

  // „Калкулирайте вноса" seed for the per-listing calculator dialog (landed-cost transparency —
  // docs/13-seo-action-plan.md Phase B). Market maps kr → kr; US-market lots split us/ca by the mapper's
  // sourceCountry (Copart/IAAI run branches in both); unknown → no market param (calculator default). Shown for EVERY
  // active car — most US/CA auction lots have no bid yet (no primary price row), but the dialog's price field is an
  // editable input, so the buyer types the bid they plan to win at. When the listing carries a primary price (USD,
  // "16 743 $" — the calculator is USD end-to-end) it pre-seeds the field: a Buy Now price always, a current bid only
  // from MIN_BID_SEED_USD (owner decision 16). Past cars only excluded — a sold car's price isn't an input.
  const calcSeed: {
    priceUsd?: number;
    market?: MarketId;
    vehicleType?: VehicleType;
    auction?: UsAuction;
    usLocation?: { zip?: string; city?: string; state?: string };
    caFromBc?: boolean;
  } | null = (() => {
    if (detail.isPast) return null;
    const amountUsd = Number(primaryPrice?.value.replace(/[^\d]/g, ""));
    // An active car's primary price is its Buy Now price when it has one, else the current bid (car-detail-mapper).
    const seeds = Number.isFinite(amountUsd) && amountUsd > 0 && (detail.hasBuyNow || amountUsd >= MIN_BID_SEED_USD);
    const market: MarketId | undefined =
      detail.market === "kr"
        ? "kr"
        : detail.sourceCountry === "Канада"
          ? "ca"
          : detail.market === "us"
            ? "us"
            : undefined;
    return {
      priceUsd: seeds ? Math.round(amountUsd) : undefined,
      market,
      vehicleType: detail.calcVehicleType,
      auction: detail.calcAuction,
      usLocation: detail.calcUsLocation,
      caFromBc: detail.calcCaFromBc,
    };
  })();

  // Breadcrumb matching the visible nav EXACTLY (Catalog → [model hub] → this car — the visible trail has no
  // „Начало" crumb, so none is marked up). Emitted for both active and past cars (a breadcrumb is fine on a noindexed
  // page — it just won't surface; harmless and keeps the trail consistent).
  const crumbs: Breadcrumb[] = [
    { name: "Всички автомобили", url: "/vsichki-avtomobili" },
    ...(hubHref && hubLabel ? [{ name: hubLabel, url: hubHref }] : []),
    { name: detail.title, url: `/avtomobil/${id}` },
  ];
  const breadcrumbJsonLd = buildBreadcrumbJsonLd(crumbs);

  // The price panel renders nothing without a price, a live bid or an average (CarPricePanel); the layout then
  // spreads the contact panel's buttons instead (`cd-noprice`, board `cd-moto`).
  const hasPricePanel = detail.prices.length > 0 || !!detail.liveBid || !!detail.marketAvg;

  // ENCAR (Korea) sections. The VIN card's Korean line (owner decision 15) points to the first history section that
  // renders — the inspection, the insurance record or the timeline — and shows only when one does.
  const korean = detail.market === "kr";
  const showInspection = korean && !!detail.inspection && hasInspectionData(detail.inspection);
  const showInsurance = korean && !!detail.insurance && hasInsuranceSignal(detail.insurance);
  const showHistory = korean && !!detail.history && detail.history.length > 0;
  const encarTarget = showInspection ? "inspection" : showInsurance ? "insurance" : showHistory ? "history" : null;

  const prefill = carInquiryPrefill(detail);

  return (
    <>
      {jsonLd ? (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      ) : null}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />

      {/* Breadcrumb (Catalog → [model hub] → this car). The model-hub link is shown only when it resolves — see
          `hubHref` above. */}
      <div className="sa-wrap">
        <nav className="sa-crumbs cd-crumbs" aria-label="Пътечка">
          <Link href="/vsichki-avtomobili">Всички автомобили</Link>
          {hubHref && hubLabel ? (
            <>
              <i aria-hidden="true">/</i>
              <Link href={hubHref}>{hubLabel}</Link>
            </>
          ) : null}
          <i aria-hidden="true">/</i>
          <span aria-current="page">{detail.title}</span>
        </nav>
      </div>

      <div className={`sa-wrap cd-grid ${detail.isPast ? "is-past" : ""} ${hasPricePanel ? "" : "cd-noprice"}`}>
        <div className="cd-media">
          <CarGallery images={detail.images} alt={detail.title} />
          {detail.media ? <CarMediaStrip media={detail.media} /> : null}
        </div>

        <div className="cd-side">
          <div className="cd-id">
            <div className="cd-meta">
              {/* The make on its plate (decision 8), the logo's alt as today („{марка} лого"). No plate when the
                  make doesn't resolve (as on the card; REDESIGN.md, Q7). */}
              {detail.brand ? (
                <MakePlate name={detail.brand} logo={detail.brandLogo ?? null} alt={`${detail.brand} лого`} />
              ) : null}
              <span className="cd-src">{detail.source}</span>
              {detail.isPast ? (
                <span className="sa-tag">{detail.isUnsold ? "НЕПРОДАДЕН" : "ПРОДАДЕН"}</span>
              ) : detail.hasBuyNow ? (
                <span className="sa-tag sa-tag--buy">BUY NOW</span>
              ) : null}
              {detail.lotNumber ? (
                <span className="cd-lot">
                  Лот № <b>{detail.lotNumber}</b>
                </span>
              ) : null}
            </div>

            <div className="cd-titlerow">
              {/* Upper case as today (the titles are Latin). */}
              <h1 className="cd-h1 uppercase">{detail.title}</h1>
              {/* Past/sold cars can still be saved for price research. */}
              <FavoriteButton carId={id} size="lg" variant="solid" />
            </div>

            <CarHighlights highlights={detail.highlights} />

            {detail.odometerNotActual || detail.usageFlag ? (
              <div className="cd-flags">
                {detail.odometerNotActual ? (
                  <span className="sa-tag sa-tag--warn sa-tag--lg">
                    <TriangleAlertIcon />
                    Непотвърден километраж
                  </span>
                ) : null}
                {detail.usageFlag ? (
                  <span className="sa-tag sa-tag--warn sa-tag--lg">
                    <TriangleAlertIcon />
                    {detail.usageFlag}
                  </span>
                ) : null}
              </div>
            ) : null}

            {detail.usTags && detail.usTags.length > 0 ? <CarTagChips tags={detail.usTags} /> : null}
          </div>

          {/* The buy box, sticky beside the details from 1024 px. */}
          <div className="cd-buy">
            {/* Status / countdown strip. Past: the result. Active: AuctionCountdown owns the row (a live countdown
                only for a genuinely future sale date, else the real status — never a false „Приключил" for a
                lapsed-but-still-active upstream lot). */}
            <div className="cd-status">
              {detail.isPast ? (
                <StatusValue status={detail.status} />
              ) : (
                <AuctionCountdown saleDate={detail.saleDate} status={detail.status} />
              )}
            </div>

            {hasPricePanel || calcSeed ? (
              <div className="cd-pricecol">
                <CarPricePanel prices={detail.prices} liveBid={detail.liveBid} marketAvg={detail.marketAvg} />

                {/* Per-listing landed-cost transparency: a button that opens the full import calculator in a dialog,
                    pre-seeded with THIS car's price + market + vehicle-type size class. */}
                {calcSeed ? (
                  <CarImportCalculator
                    defaultPrice={calcSeed.priceUsd}
                    defaultMarket={calcSeed.market}
                    defaultVehicleType={calcSeed.vehicleType}
                    defaultAuction={calcSeed.auction}
                    defaultUsLocation={calcSeed.usLocation}
                    defaultCaFromBc={calcSeed.caFromBc}
                    carLabel={detail.title}
                    lotNumber={detail.lotNumber}
                  />
                ) : null}
              </div>
            ) : null}

            {detail.isPast ? (
              <LinkButton id={PAST_CTA_ID} href={activeCatalogHref} variant="pri" block className="cd-pastcta">
                Вижте активни обяви
              </LinkButton>
            ) : (
              <CarContactPanel
                title={detail.title}
                brand={detail.brand}
                model={detail.model}
                year={detail.year}
                lotNumber={detail.lotNumber}
                brandLogo={detail.brandLogo ?? null}
                vin={detail.vin}
                market={detail.market}
              />
            )}
          </div>
        </div>

        <div className="cd-info">
          {/* IAA Vehicle Score meter (IAAI-only). `!= null` because 0 is a valid score (non-repairable). */}
          {detail.iaaScore != null ? <CarIaaScore value={detail.iaaScore} /> : null}

          <CarSpecSheet specs={detail.specs} />

          {/* Per-car VIN history check → Carfax lead funnel. Only when the car carries a VIN (the `cars.vin` column is
              nullable; many lots have none). Reuses the free /api/vin-check lookup, DB-cached per VIN. */}
          {detail.vin ? (
            <CarVinCheck
              vin={detail.vin}
              make={detail.brand}
              model={detail.model}
              encarHistory={encarTarget !== null}
            />
          ) : null}

          <CarSellerLocation seller={detail.seller} location={detail.location} geo={detail.geo} />

          {/* ENCAR (Korea) retail sections. All data is parsed into the view-model in the mapper; each section
              self-hides when its block is absent (also true of archived ENCAR lots, whose details tree is stripped
              to price-only). */}
          {korean ? (
            <>
              {showInspection && detail.inspection ? (
                <CarInspection
                  inspection={detail.inspection}
                  id={encarTarget === "inspection" ? ENCAR_HISTORY_ID : undefined}
                />
              ) : null}
              {showInsurance && detail.insurance ? (
                <CarInsuranceSummary
                  insurance={detail.insurance}
                  id={encarTarget === "insurance" ? ENCAR_HISTORY_ID : undefined}
                />
              ) : null}
              {detail.factoryOptions ? <CarFactoryOptions options={detail.factoryOptions} /> : null}
              {showHistory && detail.history ? (
                <CarHistoryTimeline
                  history={detail.history}
                  id={encarTarget === "history" ? ENCAR_HISTORY_ID : undefined}
                />
              ) : null}
              {detail.sellerNote ? <CarSellerNote note={detail.sellerNote} /> : null}
            </>
          ) : null}
        </div>
      </div>

      <RelatedCars cars={related} />

      <CarActionBar
        watchId={detail.isPast ? PAST_CTA_ID : CONTACT_PANEL_ID}
        price={primaryPrice}
        past={detail.isPast}
        activeHref={activeCatalogHref}
        saleDate={detail.saleDate}
        status={detail.status}
        prefill={prefill}
      />
    </>
  );
}

/** One placeholder bar (the kit's `.sa-sk`). */
function Bar({ className }: { className: string }) {
  return <span className={`sa-sk block max-w-full ${className}`} />;
}

/**
 * Placeholder shown while the detail body streams in (board `cd-loading`) — the single Suspense fallback for the whole
 * page body, so it mirrors the real layout on each width to keep the swap near shift-free: breadcrumb → gallery +
 * thumbnail strip → identity (plate, source, lot, two title lines, highlight chips) → the buy box (status strip,
 * price panel, calculator, contact panel) → the details → the „Подобни автомобили" rail of card skeletons.
 *
 * The IAAI score card is deliberately NOT placeholdered: it's IAAI-scored-only, so a block here would flash empty for
 * the Copart/Encar/unscored majority.
 */
function CarDetailSkeleton() {
  return (
    <div aria-busy="true">
      <div className="sa-wrap cd-crumbs">
        <Bar className="h-4 w-64" />
      </div>

      <div className="sa-wrap cd-grid">
        <div className="cd-media">
          <div className="sa-sk cd-skgal" />
          <div className="cd-skthr">
            {Array.from({ length: 7 }).map((_, i) => (
              <div key={i} className="sa-sk cd-skth" />
            ))}
          </div>
        </div>

        <div className="cd-side">
          <div className="cd-id">
            <div className="cd-meta">
              <Bar className="size-10 rounded-md" />
              <Bar className="h-6.5 w-18" />
              <Bar className="h-4 w-32" />
            </div>
            <Bar className="h-7.5 w-[88%]" />
            <Bar className="h-7.5 w-[56%]" />
            <div className="sa-row gap-2">
              <Bar className="h-9 w-24 rounded-md" />
              <Bar className="h-9 w-28 rounded-md" />
              <Bar className="h-9 w-21 rounded-md" />
              <Bar className="h-9 w-26 rounded-md" />
            </div>
          </div>
          <div className="cd-buy">
            <div className="sa-sk cd-skst" />
            <div className="cd-pricecol">
              <Bar className="h-40 w-full rounded-lg" />
              <Bar className="h-11 w-full rounded-md" />
            </div>
            <div className="cd-contact cd-skc">
              <Bar className="h-75 w-full rounded-lg" />
            </div>
          </div>
        </div>

        <div className="cd-info">
          <Bar className="h-72 w-full rounded-lg" />
        </div>
      </div>

      <section className="sa-band sa-band--line sa-band--tight cd-rel">
        <div className="sa-wrap">
          <div className="sa-sh">
            <div className="sa-sh__l">
              <Bar className="h-7 w-56" />
            </div>
          </div>
          <div className="cd-track">
            {Array.from({ length: 4 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
