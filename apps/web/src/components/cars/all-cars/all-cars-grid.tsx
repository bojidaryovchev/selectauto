"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { useWindowVirtualizer } from "@tanstack/react-virtual";
import { AuctionCard } from "@/components/cars/all-cars/auction-card";
import { CarGridSkeleton } from "@/components/cars/all-cars/car-grid-skeleton";
import { loadMoreCars } from "@/mutations/cars";
import type { CarFilters, CarsPage } from "@/types/car-filters.type";
import type { CarView } from "@/types/car.type";

/** Column count per breakpoint — kept in sync with the grid's CSS breakpoints. */
function columnsForWidth(width: number): number {
  if (width >= 1280) return 4; // xl
  if (width >= 1024) return 3; // lg
  if (width >= 560) return 2; // min-[560px]
  return 1;
}

const ROW_GAP = 20; // px, matches gap-5
const ESTIMATED_ROW_HEIGHT = 460; // px, AuctionCard incl. gap (self-corrects via measureElement)

/**
 * Virtualized, infinite-scroll grid for the catalog. Seeded with the SSR first
 * page; appends subsequent pages via the `loadMoreCars` Server Action when the
 * user nears the end. Uses window virtualization (the page scrolls, matching the
 * legacy full-page scroll + better for SEO/mobile) and renders only the rows near
 * the viewport, so the DOM stays small even at thousands of cards.
 *
 * Remounted (via a `key` on the filters in the parent) when filters change, so
 * state resets cleanly to the new first page.
 */
export function AllCarsGrid({ initialPage, filters }: { initialPage: CarsPage; filters: CarFilters }) {
  const [cars, setCars] = useState<CarView[]>(initialPage.cars);
  const [cursor, setCursor] = useState<string | null>(initialPage.nextCursor);
  const [isPending, startTransition] = useTransition();
  const done = cursor === null;

  // Responsive column count + scroll offset from the container (tracked in state
  // so they're never read off the ref during render).
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [columns, setColumns] = useState(1);
  const [scrollMargin, setScrollMargin] = useState(0);
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const update = () => {
      setColumns(columnsForWidth(el.clientWidth));
      setScrollMargin(el.offsetTop);
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const rowCount = Math.ceil(cars.length / columns);

  // Window virtualizer over ROWS (each row holds `columns` cards).
  const virtualizer = useWindowVirtualizer({
    count: rowCount,
    estimateSize: () => ESTIMATED_ROW_HEIGHT,
    overscan: 3,
    gap: ROW_GAP,
    scrollMargin,
  });

  const loadMore = useCallback(() => {
    if (done || isPending) return;
    startTransition(async () => {
      const next = await loadMoreCars(filters, cursor);
      setCars((prev) => [...prev, ...next.cars]);
      setCursor(next.nextCursor);
    });
  }, [done, isPending, filters, cursor]);

  // Trigger a load when the last virtual row is within ~2 rows of being rendered.
  const items = virtualizer.getVirtualItems();
  useEffect(() => {
    const last = items[items.length - 1];
    if (!last) return;
    if (last.index >= rowCount - 2 && !done && !isPending) {
      loadMore();
    }
  }, [items, rowCount, done, isPending, loadMore]);

  if (cars.length === 0) {
    return (
      <div className="rounded-2xl border border-line bg-white px-6 py-16 text-center text-base text-muted">
        Няма налични коли по избраните филтри.
      </div>
    );
  }

  return (
    <div ref={containerRef}>
      <div style={{ height: virtualizer.getTotalSize(), position: "relative", width: "100%" }}>
        {items.map((virtualRow) => {
          const start = virtualRow.index * columns;
          const rowCars = cars.slice(start, start + columns);
          return (
            <div
              key={virtualRow.key}
              data-index={virtualRow.index}
              ref={virtualizer.measureElement}
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                transform: `translateY(${virtualRow.start - scrollMargin}px)`,
              }}
            >
              <div
                className="grid gap-5"
                style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
              >
                {rowCars.map((car, i) => (
                  <AuctionCard key={car.id ?? `${start + i}`} car={car} />
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Loading-more indicator */}
      {isPending && !done ? (
        <div className="mt-5">
          <CarGridSkeleton count={columns} />
        </div>
      ) : null}
    </div>
  );
}
