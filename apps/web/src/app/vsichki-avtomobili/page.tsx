import type { Metadata } from "next";
import { Suspense } from "react";
import { Container } from "@/components/common";
import { AllCarsGrid, CarFilterBar, CarGridSkeleton } from "@/components/cars/all-cars";
import { SiteFooter, SiteHeader } from "@/components/layout";
import { parseCarFilters, serializeCarFilters } from "@/lib/car-filters";
import { getCarFacets, getCarsCount, getCarsPage } from "@/queries/cars";

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
  };
}

/**
 * /vsichki-avtomobili — the all-cars catalog. SSR renders the filter bar + the
 * first page of cars (good LCP + SEO); the client `AllCarsGrid` virtualizes and
 * infinite-scrolls from there. Filters live in the URL; changing them re-renders
 * this page server-side (and remounts the grid via its `key`).
 *
 * Reads `searchParams` here (a request-time API) and passes parsed filters as
 * args into the cached queries — `"use cache"` scopes can't read searchParams.
 */
export default async function AllCarsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const sp = await searchParams;
  const filters = parseCarFilters(sp);

  // Stable key so the client grid remounts (resets state) when filters change.
  const filtersKey = serializeCarFilters(filters).toString();

  const [facets, firstPage, count] = await Promise.all([
    getCarFacets(),
    getCarsPage(filters, null),
    getCarsCount(filters),
  ]);

  const isSearch = !!filters.search;
  const isPast = filters.status === "past";

  return (
    <>
      <SiteHeader />
      <main className="flex-1 bg-[#fafafa] text-ink">
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

            <CarFilterBar facets={facets} current={filters} />

            {isSearch ? (
              <p className="mb-4 mt-6 text-sm text-muted">Резултати от търсенето</p>
            ) : (
              <p className="mb-4 mt-6 text-sm text-muted">
                {isPast ? "Намерени резултати: " : "Намерени автомобили: "}
                <strong className="text-ink">{count.capped ? `${count.count}+` : count.count}</strong>
              </p>
            )}

            <Suspense fallback={<CarGridSkeleton count={12} />}>
              <AllCarsGrid key={filtersKey} initialPage={firstPage} filters={filters} />
            </Suspense>
          </div>
        </Container>
      </main>
      <SiteFooter />
    </>
  );
}
