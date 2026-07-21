import type { Metadata } from "next";
import { cache, Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Container, LinkButton } from "@/components/common";
import { AllCarsGrid, CarGridSkeleton } from "@/components/cars/all-cars";
import { SiteFooter, SiteHeader } from "@/components/layout";
import { MIN_HUB_LISTINGS_TO_INDEX, SITE_URL } from "@/constants";
import { brandHubPath, modelHubPath, slugify } from "@/lib/car-slug";
import { buildBreadcrumbJsonLd, buildItemListJsonLd } from "@/lib/site-jsonld";
import { buildSocialMeta } from "@/lib/social-meta";
import {
  getBrandModelHubs,
  getCarsCount,
  getCarsPage,
  getHubFacetCount,
  resolveBrandHub,
  type BrandHubResolution,
} from "@/queries/cars";
import { getSitemapBrands } from "@/queries/sitemap";
import type { CarFilters } from "@/types/car-filters.type";

type Params = Promise<{ make: string }>;

/**
 * Prerender every brand hub that has live inventory at build time (~117 makes).
 * Without this the route builds as ONE param-agnostic *fallback shell* that Next
 * resumes per request — the fragile Partial-Prerender resume path that intermittently
 * mismatched in production ("Couldn't find all resumable slots by key/index during
 * replaying … fallback to client rendering"). With a concrete param list, each make
 * gets its own fully-resolved prerendered shell, so the request-time resume is
 * per-make and can't drift against a shared fallback. `dynamicParams` stays the Next
 * default (`true`), so a make NOT in this list (e.g. a brand that gains its first
 * listing after the build) still resolves on-demand rather than 404-ing.
 *
 * Slugs come from the SAME source the hub sitemap uses (`getSitemapBrands`) via the
 * SAME `slugify`, so the prerendered params, the sitemap URLs, and each page's
 * self-canonical always agree. `minListings: 1` covers every brand that actually
 * shows cars (below the sitemap/index threshold but still a real, linkable hub). The
 * query fails closed to `[]` on a DB hiccup → all makes fall back to on-demand (i.e.
 * today's behaviour), so a transient DB error degrades gracefully, never a broken
 * build. Slugs are de-duped (two brand names could slugify identically).
 */
export async function generateStaticParams(): Promise<{ make: string }[]> {
  const brands = await getSitemapBrands(1);
  const makes = new Set<string>();
  for (const b of brands) {
    const make = slugify(b.brandName);
    if (make) makes.add(make);
  }
  return [...makes].map((make) => ({ make }));
}

/**
 * Request-scoped loader shared by `generateMetadata` and the page body so the slug
 * resolution + exact count run ONCE per request instead of once each. `resolveBrandHub`
 * is already `"use cache"`, but `getCarsCount` is a live read that otherwise ran twice
 * per request. Keyed on the route-param STRING (React `cache()` compares args by
 * identity), so the count is resolved inside this shared loader rather than by each
 * call site with its own `filters` object.
 */
const loadBrandHub = cache(async (make: string) => {
  const hub = await resolveBrandHub(make);
  if (!hub) return null;
  // `count` is the LIVE number shown to users; `indexCount` is the cached
  // facets-summary count the sitemap uses — the `noindex` gate reads the latter so
  // the page and the sitemap can never disagree (see getHubFacetCount).
  const [{ count }, indexCount] = await Promise.all([
    getCarsCount({ brand: hub.brandId }),
    getHubFacetCount(hub.brandId),
  ]);
  return { hub, count, indexCount };
});

/** The brand hub's canonical path from the resolved (re-slugged) name; falls back
 *  to the brand id defensively (the name came from a real match, so null is
 *  unreachable in practice). */
function hubPath(hub: BrandHubResolution): string {
  return brandHubPath(hub.brandName) ?? `/avtomobili/marka/${hub.brandId}`;
}

/**
 * Brand-hub metadata. Indexable when the make has enough live inventory (same
 * threshold as the model hubs), else `noindex, follow`. Canonical from the resolved
 * slug. An unresolvable make → minimal noindex head (the page `notFound()`s).
 */
export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { make } = await params;
  const data = await loadBrandHub(make);
  if (!data) return { title: "Автомобили | SelectAuto", robots: { index: false, follow: true } };

  const { hub, count, indexCount } = data;
  const path = hubPath(hub);
  const canonical = `${SITE_URL}${path}`;
  const description =
    `${hub.brandName} за внос от Copart, IAAI и Encar — ${count.toLocaleString("bg-BG")} обяви по модели. ` +
    `Виж цени, филтрирай по модел и заяви оферта за внос от SelectAuto.`;

  return {
    title: `${hub.brandName} внос от аукцион | SelectAuto`,
    description,
    alternates: { canonical },
    // Index decision uses the sitemap's source (facets summary), not the live count.
    robots: indexCount >= MIN_HUB_LISTINGS_TO_INDEX ? undefined : { index: false, follow: true },
    ...buildSocialMeta({ title: `${hub.brandName} — внос от аукцион`, description, path }),
  };
}

/**
 * /avtomobili/marka/[make] — the BRAND SEO hub (tier above the model hubs). Same
 * durable-ranking-asset rationale (docs/12-web-seo-strategy.md §4.2), for `{make} внос` head
 * terms, and — crucially — the crawlable "browse by model" surface that distributes
 * authority DOWN to the model hubs. Static shell + Suspense-streamed body, same as
 * the model hub and `avtomobil/[id]` (Cache Components: `params` is request data).
 */
export default function BrandHubPage({ params }: { params: Params }) {
  return (
    <>
      <Suspense fallback={null}>
        <SiteHeader />
      </Suspense>
      <main className="flex-1 bg-[#fafafa] pt-(--header-h) text-ink">
        <Suspense fallback={<HubSkeleton />}>
          <BrandHubBody params={params} />
        </Suspense>
      </main>
      <SiteFooter />
    </>
  );
}

async function BrandHubBody({ params }: { params: Params }) {
  const { make } = await params;
  const data = await loadBrandHub(make);
  if (!data) notFound();

  const { hub, count } = data;
  const filters: CarFilters = { brand: hub.brandId };
  const [firstPage, modelHubs] = await Promise.all([
    getCarsPage(filters, null),
    getBrandModelHubs(hub.brandId, MIN_HUB_LISTINGS_TO_INDEX),
  ]);

  const label = hub.brandName;
  const path = hubPath(hub);

  // Resolvable model-hub links (drop any whose name won't slug). These ARE the
  // internal-linking payoff of the brand tier: brand hub → each model hub.
  const modelLinks = modelHubs
    .map((m) => ({ href: modelHubPath(label, m.modelName), name: m.modelName, count: m.listingCount }))
    .filter((m): m is { href: string; name: string; count: number } => m.href !== null);

  const jsonLd = [
    // Mirrors the VISIBLE breadcrumb exactly (which starts at the catalog — no
    // „Начало" crumb is rendered, so none is marked up).
    buildBreadcrumbJsonLd([
      { name: "Всички автомобили", url: "/vsichki-avtomobili" },
      { name: label, url: path },
    ]),
    // ItemList of the model-hub URLs — the ordered set of child hubs (mirrors the
    // visible "browse by model" grid). Only emitted when there's ≥1 link (an empty
    // ItemList is low-value / mildly invalid).
    ...(modelLinks.length > 0
      ? [buildItemListJsonLd(modelLinks.map((m) => ({ url: m.href, name: `${label} ${m.name}` })))]
      : []),
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
          <nav className="mb-5 text-sm text-muted">
            <Link href="/vsichki-avtomobili" className="hover:text-brand-dark">
              Всички автомобили
            </Link>
            <span className="px-2">/</span>
            <span className="text-ink">{label}</span>
          </nav>

          <h1 className="mb-2 text-4xl font-black uppercase tracking-tight text-ink max-md:text-3xl">
            {label} внос от аукцион
          </h1>
          <p className="mb-2 max-w-2xl text-sm text-muted">
            {label} за внос от Copart, IAAI и Encar. Избери модел по-долу или разгледай всички активни
            обяви — SelectAuto поема целия внос до регистрация в КАТ.
          </p>
          <p className="mb-6 text-sm text-muted">
            Намерени автомобили: <strong className="text-ink">{count.toLocaleString("bg-BG")}</strong>
          </p>

          {/* Browse by model → the model-hub link grid (authority flows to children). */}
          {modelLinks.length > 0 ? (
            <section className="mb-10">
              <h2 className="mb-4 text-2xl font-black text-ink">Модели {label}</h2>
              <div className="flex flex-wrap gap-2.5">
                {modelLinks.map((m) => (
                  <LinkButton
                    key={m.href}
                    href={m.href}
                    rippleTheme="dark"
                    className="inline-flex items-center gap-2 rounded-full border border-line bg-white px-4 py-2 text-sm font-semibold text-ink transition-colors duration-200 hover:border-brand hover:text-brand-dark"
                  >
                    {m.name}
                    <span className="text-xs text-muted">{m.count.toLocaleString("bg-BG")}</span>
                  </LinkButton>
                ))}
              </div>
            </section>
          ) : null}

          {count === 0 ? (
            <div className="rounded-2xl border border-line bg-white px-6 py-10 text-center">
              <p className="mb-4 text-sm text-muted">
                В момента няма активни обяви за {label}. Заяви персонална селекция и ще намерим подходящ
                автомобил от аукционите.
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
                key={`brand:${hub.brandId}`}
                initialPage={firstPage}
                initialAnchor={null}
                filters={filters}
                aboveCount={0}
              />
            </Suspense>
          )}
        </div>
      </Container>
    </>
  );
}

/** Lightweight placeholder shown while the brand-hub body streams in. */
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
