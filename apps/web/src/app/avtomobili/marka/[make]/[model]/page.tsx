import type { Metadata } from "next";
import { cache, Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Container, LinkButton } from "@/components/common";
import { AllCarsGrid, CarGridSkeleton } from "@/components/cars/all-cars";
import { ModelSoldPrices } from "@/components/cars";
import { SiteFooter, SiteHeader } from "@/components/layout";
import { MIN_HUB_LISTINGS_TO_INDEX, SITE_URL } from "@/constants";
import { brandHubPath, modelHubPath } from "@/lib/car-slug";
import { buildBreadcrumbJsonLd, buildFaqJsonLd, buildItemListJsonLd } from "@/lib/site-jsonld";
import { buildSocialMeta } from "@/lib/social-meta";
import {
  getCarsCount,
  getCarsPage,
  getHubFacetCount,
  getModelHubStats,
  getModelSoldPricesByYear,
  resolveCarHub,
  type CarHubResolution,
  type ModelHubStats,
} from "@/queries/cars";
import type { CarFilters } from "@/types/car-filters.type";

type Params = Promise<{ make: string; model: string }>;

/**
 * Request-scoped loader shared by `generateMetadata` and the page body so the slug
 * resolution + exact count run ONCE per request instead of once each. `resolveCarHub`
 * is already `"use cache"` (deduped on its own), but `getCarsCount` is a live read —
 * without this it ran twice per hub request. Keyed on the route-param STRINGS:
 * React `cache()` compares args by identity, so a fresh `filters` object at each call
 * site would not dedup — the count must be resolved inside this shared loader.
 */
const loadModelHub = cache(async (make: string, model: string) => {
  const hub = await resolveCarHub(make, model);
  if (!hub) return null;
  const filters: CarFilters = { brand: hub.brandId, model: hub.modelId };
  // `count` = live number shown to users; `indexCount` = the cached facets-summary
  // count the hub sitemap uses — the `noindex` gate reads the latter so the page
  // and the sitemap can never contradict (see getHubFacetCount).
  const [{ count }, indexCount] = await Promise.all([
    getCarsCount(filters),
    getHubFacetCount(hub.brandId, hub.modelId),
  ]);
  return { hub, filters, count, indexCount };
});

/** The hub's canonical path from resolved (re-slugged) names — collapses any
 *  near-miss casing/spacing in the requested URL to one canonical form. The names
 *  came from `resolveCarHub` (which matched a real make/model), so the shared
 *  builder never returns null here; fall back to the requested path defensively. */
function hubPath(hub: CarHubResolution): string {
  return modelHubPath(hub.brandName, hub.modelName) ?? `/avtomobili/marka/${hub.brandId}/${hub.modelId}`;
}

/** Format a USD amount as a BG-grouped price string, e.g. 39299 → "39 299 $". */
function usd(amount: number): string {
  return `${amount.toLocaleString("bg-BG")} $`;
}

/** BG singular/plural for "обява" — "1 обява", "2 обяви". BG uses the plural form
 *  for every count except exactly 1. */
function obiavi(n: number): string {
  return `${n.toLocaleString("bg-BG")} ${n === 1 ? "обява" : "обяви"}`;
}

/**
 * A price floor for the displayed band. The feed carries junk low prices (a "2 $"
 * Camry is a bad/placeholder row, not a real offer) that make the range look
 * absurd on an indexable page. Treat anything under this as noise and fall back to
 * the median-only phrasing. Deliberately conservative — a genuine salvage lot can
 * be a few hundred dollars.
 */
const MIN_CREDIBLE_PRICE = 300;

/** How many listings a make/model needs before we make a confident "predominantly
 *  from {country}" claim — one listing from Korea is not a sourcing pattern. */
const MIN_SAMPLE_FOR_COUNTRY_CLAIM = 10;

/**
 * Model-hub metadata. A hub with enough live inventory is fully indexable with a
 * keyword-rich title/description + a canonical built from the resolved slugs.
 * Below the inventory threshold it's `noindex, follow` (thin-content guard). An
 * unresolvable make/model slug yields a minimal noindex head (the page itself
 * `notFound()`s).
 */
export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { make, model } = await params;
  const data = await loadModelHub(make, model);
  if (!data) return { title: "Автомобили | SelectAuto", robots: { index: false, follow: true } };

  const { hub, count, indexCount } = data;
  const path = hubPath(hub);
  const canonical = `${SITE_URL}${path}`;
  const label = `${hub.brandName} ${hub.modelName}`;
  const description =
    `${label} за внос от Copart, IAAI и Encar — ${obiavi(count)}. ` +
    `Виж цени, спецификации и заяви оферта за внос от SelectAuto.`;

  return {
    title: `${label} внос от аукцион | SelectAuto`,
    description,
    alternates: { canonical },
    // Index decision uses the sitemap's source (facets summary), not the live count.
    robots: indexCount >= MIN_HUB_LISTINGS_TO_INDEX ? undefined : { index: false, follow: true },
    ...buildSocialMeta({ title: `${label} — внос от аукцион`, description, path }),
  };
}

/**
 * /avtomobili/marka/[make]/[model] — the programmatic make/model SEO hub
 * (docs/12-web-seo-strategy.md §4.2). A durable ranking asset for `{make} {model} внос от
 * {държава}` long-tail: unlike a single transient listing it accumulates authority
 * across inventory churn, and it's the crawlable internal-link surface into deep
 * inventory the infinite-scroll catalog can't provide.
 *
 * Static shell (skeleton main + footer) renders immediately; the data-dependent
 * body streams inside `<Suspense>` — required by Cache Components, since `params`
 * is uncached request data (same pattern as `avtomobil/[id]` and the catalog).
 * The header sits in its OWN boundary because it reads `usePathname()`, which is
 * unknown while a dynamic route's fallback shell prerenders — see the note on
 * `CarDetailPage`. No `generateStaticParams`: ~117 makes × ~1286 models is too
 * many to prerender, so pages render on first request and are saved to disk
 * thereafter.
 */
export default function ModelHubPage({ params }: { params: Params }) {
  return (
    <>
      <Suspense fallback={null}>
        <SiteHeader />
      </Suspense>
      <main className="flex-1 bg-[#fafafa] pt-(--header-h) text-ink">
        <Suspense fallback={<HubSkeleton />}>
          <HubBody params={params} />
        </Suspense>
      </main>
      <SiteFooter />
    </>
  );
}

/**
 * Async body: resolve the slugs → ids, fetch the first listings page + exact count,
 * render the hub. An unresolvable make/model → `notFound()` (injects `noindex`).
 * The client `AllCarsGrid` takes over infinite scroll from the SSR first page,
 * pre-filtered to this make/model (its `key` resets it if the filter identity
 * changes across navigations).
 */
async function HubBody({ params }: { params: Params }) {
  const { make, model } = await params;
  const data = await loadModelHub(make, model);
  if (!data) notFound();

  const { hub, filters, count } = data;
  const [firstPage, stats, soldByYear] = await Promise.all([
    getCarsPage(filters, null),
    getModelHubStats(hub.brandId, hub.modelId),
    getModelSoldPricesByYear(hub.brandId, hub.modelId),
  ]);

  const label = `${hub.brandName} ${hub.modelName}`;
  const path = hubPath(hub);
  const intro = hubIntro(label, stats);
  // Up-link to the parent brand hub (Home → Catalog → Brand → this model).
  const brandHref = brandHubPath(hub.brandName);

  // JSON-LD: breadcrumb (Home → Catalog → this hub) + an ItemList of the SSR first
  // page's canonical detail URLs (the lightweight paginated-listing pattern — the
  // per-car Product lives on each detail page). FAQ block mirrors the visible copy
  // below (Google requires FAQ markup to match on-page content).
  const faq = hubFaq(label, stats);
  const jsonLd = [
    // Mirrors the VISIBLE breadcrumb exactly (starts at the catalog — no
    // „Начало" crumb is rendered, so none is marked up).
    buildBreadcrumbJsonLd([
      { name: "Всички автомобили", url: "/vsichki-avtomobili" },
      ...(brandHref ? [{ name: hub.brandName, url: brandHref }] : []),
      { name: label, url: path },
    ]),
    // Only when the first page has ≥1 car (an empty ItemList is low-value / mildly
    // invalid; a below-threshold hub is noindex anyway).
    ...(firstPage.cars.length > 0
      ? [buildItemListJsonLd(firstPage.cars.map((c) => ({ url: c.href, name: c.title })))]
      : []),
    buildFaqJsonLd(faq),
  ];

  return (
    <>
      {jsonLd.map((node, i) => (
        <script
          key={i}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(node) }}
        />
      ))}

      <Container>
        <div className="py-10 max-md:py-7">
          {/* Breadcrumb (matches the JSON-LD trail). Brand crumb links up to the
              parent brand hub when it resolves. */}
          <nav className="mb-5 text-sm text-muted">
            <Link href="/vsichki-avtomobili" className="hover:text-brand-dark">
              Всички автомобили
            </Link>
            {brandHref ? (
              <>
                <span className="px-2">/</span>
                <Link href={brandHref} className="hover:text-brand-dark">
                  {hub.brandName}
                </Link>
              </>
            ) : null}
            <span className="px-2">/</span>
            <span className="text-ink">{label}</span>
          </nav>

          <h1 className="mb-2 text-4xl font-black uppercase tracking-tight text-ink max-md:text-3xl">
            {label} внос от аукцион
          </h1>
          <p className="mb-2 max-w-2xl text-sm text-muted">{intro}</p>
          <p className="mb-6 text-sm text-muted">
            Намерени автомобили: <strong className="text-ink">{count.toLocaleString("bg-BG")}</strong>
          </p>

          {count === 0 ? (
            <div className="rounded-2xl border border-line bg-white px-6 py-10 text-center">
              <p className="mb-4 text-sm text-muted">
                В момента няма активни обяви за {label}. Заяви персонална селекция и ще намерим
                подходящ автомобил от аукционите.
              </p>
              <LinkButton
                href="/vsichki-avtomobili"
                rippleTheme="light"
                className="inline-flex min-h-12 items-center justify-center rounded-full bg-brand px-6 text-sm font-extrabold uppercase tracking-wide text-white transition-transform duration-200 hover:-translate-y-0.5"
              >
                Виж всички автомобили
              </LinkButton>
            </div>
          ) : (
            <Suspense fallback={<CarGridSkeleton count={12} />}>
              <AllCarsGrid
                key={`${hub.brandId}:${hub.modelId}`}
                initialPage={firstPage}
                initialAnchor={null}
                filters={filters}
                aboveCount={0}
              />
            </Suspense>
          )}

          {/* Real per-year sold-price averages (our archive) — market benchmark +
              unique aggregate content. Self-hides when there aren't enough sales. */}
          <ModelSoldPrices label={label} rows={soldByYear} />

          {/* FAQ — visible copy backing the FAQPage JSON-LD (must match) */}
          <section className="mt-14 max-w-2xl">
            <h2 className="mb-5 text-2xl font-black text-ink">Често задавани въпроси</h2>
            <dl className="flex flex-col gap-5">
              {faq.map((f) => (
                <div key={f.question}>
                  <dt className="mb-1 font-bold text-ink">{f.question}</dt>
                  <dd className="text-sm text-muted">{f.answer}</dd>
                </div>
              ))}
            </dl>
          </section>
        </div>
      </Container>
    </>
  );
}

/**
 * Data-driven intro sentence. Weaves in whichever REAL aggregates are available
 * for this make/model (price band, year range, dominant source country) so the
 * copy genuinely differs per hub — a Camry and a Civic get different numbers and a
 * KR-sourced model names Корея, not САЩ. Degrades to the generic lead when stats
 * are null (a make/model too small to have meaningful aggregates), which is exactly
 * the case the thin-content guard already keeps out of the index.
 */
/** The credible price band [min,max] for display, or null if there isn't a real
 *  spread above the junk-price floor. */
function priceBand(stats: ModelHubStats): { min: number; max: number } | null {
  if (stats.priceMin == null || stats.priceMax == null) return null;
  const min = Math.max(stats.priceMin, MIN_CREDIBLE_PRICE);
  if (stats.priceMax <= min) return null; // no meaningful spread above the floor
  return { min, max: stats.priceMax };
}

/** Whether we can confidently name a dominant source country (share ≥60% AND a
 *  large enough sample that it's a real pattern, not a one-off). */
function hasCountryClaim(stats: ModelHubStats): boolean {
  return (
    stats.topCountryLabel != null &&
    stats.count >= MIN_SAMPLE_FOR_COUNTRY_CLAIM &&
    (stats.topCountryShare ?? 0) >= 0.6
  );
}

function hubIntro(label: string, stats: ModelHubStats | null): string {
  const base = `${label} за внос от Copart, IAAI и Encar.`;
  if (!stats) {
    return `${base} Разгледай активните обяви по-долу, виж реалните аукционни цени и заяви оферта — SelectAuto поема целия внос до регистрация в КАТ.`;
  }

  const bits: string[] = [];
  const band = priceBand(stats);
  if (band) bits.push(`с аукционни цени от ${usd(band.min)} до ${usd(band.max)}`);
  if (stats.yearMin != null && stats.yearMax != null && stats.yearMin !== stats.yearMax) {
    bits.push(`от ${stats.yearMin} до ${stats.yearMax} година`);
  }
  if (hasCountryClaim(stats)) bits.push(`предимно от ${stats.topCountryLabel}`);

  const detail = bits.length > 0 ? ` Наличните ${label} са ${bits.join(", ")}.` : "";
  return `${base}${detail} Виж реалните аукционни цени по-долу и заяви оферта — SelectAuto поема целия внос до регистрация в КАТ.`;
}

/**
 * Self-contained, citable Q&A for the hub (GEO/AI-Overview play — docs/12-web-seo-strategy.md §6),
 * built from the model's REAL aggregates so the answers differ per hub rather than
 * being one template with a swapped name (which near-duplicate detection normalizes
 * out). The price/source answers state this model's actual band/country; the
 * import-time answer is genuinely model-independent, so it stays generic (faking
 * per-model variation there would be dishonest and add no value). Kept in one place
 * so the visible block and the FAQPage JSON-LD never diverge.
 */
function hubFaq(label: string, stats: ModelHubStats | null): { question: string; answer: string }[] {
  const band = stats ? priceBand(stats) : null;
  const priceAnswer =
    band && stats
      ? `Активните обяви за ${label} са с аукционни цени от ${usd(band.min)} до ${usd(band.max)}` +
        (stats.priceMedian != null && stats.priceMedian >= MIN_CREDIBLE_PRICE
          ? ` (медиана около ${usd(stats.priceMedian)})`
          : "") +
        `. Към това се добавят транспорт, мито, ДДС и такси за регистрация — виж калкулатора на SelectAuto ` +
        `за крайна оферта според конкретния автомобил.`
      : `Крайната цена за ${label} зависи от аукционната цена, транспорта, митото, ДДС и таксите за ` +
        `регистрация. Използвай калкулатора на SelectAuto за ориентировъчна оферта според конкретния автомобил.`;

  const sourceAnswer =
    stats && hasCountryClaim(stats)
      ? `Наличните ${label} са предимно от ${stats.topCountryLabel} (аукционите Copart, IAAI и Encar). ` +
        `За всеки автомобил проверяваме историята (Carfax/VIN) преди наддаване.`
      : `SelectAuto внася ${label} от аукционите Copart и IAAI (САЩ/Канада) и Encar (Корея). ` +
        `За всеки автомобил проверяваме историята (Carfax/VIN) преди наддаване.`;

  // Verb + trailing clause must agree with the buy-now count: "1 обява Е … (no
  // 'останалите' when it's the only listing)" vs "N обяви СА … останалите на търг".
  const hasOthers = stats != null && stats.count > stats.buyNowCount;
  const availabilityAnswer =
    stats && stats.buyNowCount > 0
      ? `Да — от активните ${label} ${obiavi(stats.buyNowCount)} ${stats.buyNowCount === 1 ? "е" : "са"} ` +
        `с фиксирана цена (Buy Now)${hasOthers ? ", останалите се предлагат на търг" : ""}. ` +
        `Buy Now позволява покупка без наддаване.`
      : `${label} се предлагат основно на търг. Заяви персонална селекция и следим за подходящ автомобил ` +
        `и Buy Now оферта.`;

  return [
    { question: `Колко струва внос на ${label}?`, answer: priceAnswer },
    { question: `Откъде се внася ${label}?`, answer: sourceAnswer },
    { question: `Има ли ${label} с фиксирана цена (Buy Now)?`, answer: availabilityAnswer },
    {
      question: `Колко време отнема вносът?`,
      answer:
        "Обичайно 6–10 седмици от спечелването на търга до готовност за регистрация в КАТ — според " +
        "държавата на произход и транспорта.",
    },
  ];
}

/** Lightweight placeholder shown while the hub body streams in. */
function HubSkeleton() {
  return (
    <Container>
      <div className="py-10 max-md:py-7">
        <div className="mb-5 h-4 w-64 animate-pulse rounded-sm bg-line" />
        <div className="mb-2 h-9 w-2/3 animate-pulse rounded-sm bg-line" />
        <div className="mb-6 h-4 w-1/2 animate-pulse rounded-sm bg-line" />
        <CarGridSkeleton count={12} />
      </div>
    </Container>
  );
}
