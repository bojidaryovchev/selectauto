import type { Metadata } from "next";
import { Suspense } from "react";
import { Container } from "@/components/common";
import { AllCarsGrid, CarFilterBar, CarGridSkeleton } from "@/components/cars/all-cars";
import { SiteFooter, SiteHeader } from "@/components/layout";
import { FilterNavProvider } from "@/contexts/filter-nav-context";
import { SITE_URL } from "@/constants";
import { AFTER_PARAM, parseCarFilters, serializeCarFilters } from "@/lib/car-filters";
import { buildItemListJsonLd } from "@/lib/site-jsonld";
import { getCarFacets, getCarsCount, getCarsPage, getCarsWindow } from "@/queries/cars";

type SearchParams = Record<string, string | string[] | undefined>;

/**
 * Per-request metadata. The PAST/sold view (`?status=past`) is set to
 * `noindex, follow`: it's a price-research utility over ~160k thin, fast-decaying
 * sold-car rows — exactly the programmatic-SEO pattern Google penalizes if
 * indexed. We let crawlers follow links through it but keep it out of the index;
 * the indexable SEO play is a future model-level auction-price page. The active
 * catalog stays fully indexable.
 */
export async function generateMetadata({ searchParams }: { searchParams: Promise<SearchParams> }): Promise<Metadata> {
  const sp = await searchParams;
  const isPast = parseCarFilters(sp).status === "past";
  if (isPast) {
    return {
      title: "Приключили търгове | SelectAuto",
      description:
        "Резултати от приключили автомобилни търгове (Copart, IAAI, Encar) — реализирани цени за справка.",
      robots: { index: false, follow: true },
    };
  }
  return {
    title: "Всички автомобили | SelectAuto",
    description:
      "Разгледай всички автомобили от Copart, IAAI и Encar, които можем да внесем за теб — с филтри по марка, модел, цвят, година и цена. Buy Now и аукционни оферти на едно място.",
    // Filtered/faceted variants (?brand=…&color=… etc.) consolidate to the bare
    // catalog URL — the one indexable canonical for the active listing surface.
    alternates: { canonical: `${SITE_URL}/vsichki-avtomobili` },
  };
}

/**
 * /vsichki-avtomobili — the all-cars catalog. SSR renders the filter bar + the
 * first page of cars (good LCP + SEO): the grid serves the seeded cars as a
 * plain static grid for SSR/first paint — real card markup + links for crawlers,
 * since the virtualizer itself renders zero rows server-side — then virtualizes
 * and infinite-scrolls after mount. Filters live in the URL; changing them
 * re-renders this page server-side (and remounts the grid via its `key`).
 *
 * Reads `searchParams` here (a request-time API) and passes parsed filters as
 * args into the query functions, which read Neon directly (no app-level cache).
 */
export default async function AllCarsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const sp = await searchParams;
  const filters = parseCarFilters(sp);

  // Stable key so the client grid remounts (resets state) when filters change.
  // NOTE: `after` (the scroll page-pointer, read below) is deliberately NOT part
  // of this key or of parseCarFilters — it addresses a scroll position, not a
  // filter, so changing only `after` must not remount/reset the grid.
  const filtersKey = serializeCarFilters(filters).toString();

  // `?after=<sortId>` — a shared deep link to a page mid-catalog. When present on
  // a feed (not search), seed a WINDOW around that anchor server-side so the first
  // paint already contains the target card (no post-mount refetch, no hydration
  // flash — the canonical tag above collapses `after`, so there's no SEO cost).
  // Malformed/absent → normal first page from the top.
  const afterRaw = sp[AFTER_PARAM];
  const after = typeof afterRaw === "string" ? afterRaw : Array.isArray(afterRaw) ? afterRaw[0] : undefined;
  const useWindow = !!after && !filters.search;

  const [facets, firstPage, count] = await Promise.all([
    // Pass filters so the count-bearing dropdowns (Тип/Гориво/Състояние) show
    // counts for the CURRENT selection (live leave-one-out) once a selective
    // filter is set — otherwise the global summary counts stand. See getCarFacets.
    getCarFacets(filters),
    useWindow ? getCarsWindow(filters, after!) : getCarsPage(filters, null),
    getCarsCount(filters),
  ]);

  // The window seed carries an anchor id (the card to scroll to top) and the
  // window's absolute feed position (aboveCount); the plain first page has
  // neither. Narrow without leaking the extra fields into the grid props.
  const initialAnchor: string | null =
    "anchorId" in firstPage ? ((firstPage as { anchorId: string | null }).anchorId ?? null) : null;
  const aboveCount: number =
    "aboveCount" in firstPage ? ((firstPage as { aboveCount: number }).aboveCount ?? 0) : 0;

  const isSearch = !!filters.search;
  const isPast = filters.status === "past";

  // Structured data for the active (indexable) catalog only — the past view is
  // noindex, so its JSON-LD would be ignored. ItemList = the SSR first page of
  // listings (their canonical detail URLs), the lightweight pattern for a
  // paginated listing (per-car Product lives on each detail page). NO
  // BreadcrumbList here: the catalog renders no visible breadcrumb nav, and
  // breadcrumb markup must correspond to on-page content.
  const catalogJsonLd =
    isPast
      ? null
      : [buildItemListJsonLd(firstPage.cars.map((c) => ({ url: c.href, name: c.title })))];

  return (
    <>
      <SiteHeader />
      <main className="flex-1 bg-[#fafafa] pt-(--header-h) text-ink">
        {catalogJsonLd?.map((node, i) => (
          <script
            key={i}
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(node) }}
          />
        ))}
        <Container>
          <div className="py-10 max-md:py-7">
            <h1 className="mb-2 text-4xl font-black uppercase tracking-tight text-ink max-md:text-3xl">
              {isPast ? "Приключили търгове" : "Всички автомобили"}
            </h1>
            {isPast ? (
              <p className="mb-6 max-w-2xl text-sm text-muted">
                Реализирани цени от приключили търгове — за справка. Тези автомобили вече не са активни.
              </p>
            ) : null}

            {/* Shares one pending state across the filter bar and the grid: a
                filter change is a soft (transition) navigation that keeps the old
                grid on screen and suppresses the Suspense skeleton, so the
                provider surfaces the in-flight state as a dimmed grid + indicator
                instead of a silent freeze-then-swap. */}
            <FilterNavProvider>
              <CarFilterBar facets={facets} current={filters} />

              {isSearch ? (
                <p className="mb-4 mt-6 text-sm text-muted">Резултати от търсенето</p>
              ) : (
                <p className="mb-4 mt-6 text-sm text-muted">
                  {isPast ? "Намерени резултати: " : "Намерени автомобили: "}
                  <strong className="text-ink">{count.count.toLocaleString("bg-BG").replace(/ /g, " ")}</strong>
                </p>
              )}

              <Suspense fallback={<CarGridSkeleton count={12} />}>
                <AllCarsGrid
                  key={filtersKey}
                  initialPage={firstPage}
                  initialAnchor={initialAnchor}
                  filters={filters}
                  // Search is a capped lookup, not a feed — its "total" is just
                  // what came back. The feed passes the exact filtered count so
                  // the grid can reserve fixed space for the entire catalog.
                  totalCount={isSearch ? firstPage.cars.length : count.count}
                  aboveCount={aboveCount}
                />
              </Suspense>
            </FilterNavProvider>
          </div>
        </Container>
      </main>
      <SiteFooter />
    </>
  );
}
