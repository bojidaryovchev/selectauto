"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useWindowVirtualizer, windowScroll } from "@tanstack/react-virtual";
import { AuctionCard } from "@/components/cars/all-cars/auction-card";
import { SkeletonCard } from "@/components/cars/all-cars/car-grid-skeleton";
import { useFilterNav } from "@/contexts/filter-nav-context";
import { AFTER_PARAM } from "@/lib/car-filters";
import { loadMoreCars, loadPrevCars } from "@/mutations/cars";
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
// Cold-start row height until the first real measurement lands (~714–741px per
// breakpoint). Cards are DETERMINISTIC-height (see AuctionCard), so a single
// measured row makes the estimate exact for every row.
const ESTIMATED_ROW_HEIGHT = 715;

/**
 * Write the `?after=<sortId>` scroll page-pointer into the URL WITHOUT touching
 * the Next.js router. This fires continuously as the user scrolls across page
 * boundaries, and it MUST NOT be seen by the router.
 *
 * Next 16 patches `window.history.replaceState` (an OWN property on the history
 * instance) so any call syncs the change into the router: it dispatches
 * `ACTION_RESTORE`, moving the router's canonical URL to the new `?after` value.
 * That is actively harmful here: the catalog's infinite scroll is driven by the
 * `loadMoreCars` Server Action, whose request is bound to the router's state
 * tree / canonical URL. When the pointer moves the canonical URL WHILE a Server
 * Action is in flight (both happen at once during fast/deep scrolling), and that
 * action stalls (a slow `getCarsPage`/DB round-trip), Next reconciles the
 * mismatch by discarding the action and performing a full-page (MPA) navigation
 * to the current `?after` URL — a hard reload that snaps scroll to the top
 * before the anchor restore drags it back down. That is the "scrolling down
 * sometimes jumps to the top" bug.
 *
 * Fix: call the NATIVE `History.prototype.replaceState` (the unpatched prototype
 * method — Next only shadowed the instance method), so the address bar still
 * updates (deep-link + refresh restore keep working: page.tsx reads `?after`
 * server-side on a real load) but the router never learns about it and its
 * canonical URL never drifts. Preserve `window.history.state` so Next's own
 * internal history entry (`__NA`, the tree) stays intact. `replace` (not push)
 * so the back button isn't flooded. Nothing client-side reads `?after` via
 * `useSearchParams` — the pointer effect reads `window.location` directly — so
 * keeping the router out of the loop costs nothing.
 */
function writeAfterPointer(sortId: number | null): void {
  if (typeof window === "undefined") return;
  const url = new URL(window.location.href);
  const prev = url.searchParams.get(AFTER_PARAM);
  const nextVal = sortId === null ? null : String(sortId);
  if (prev === nextVal) return; // no-op: don't spam history with identical states
  if (nextVal === null) url.searchParams.delete(AFTER_PARAM);
  else url.searchParams.set(AFTER_PARAM, nextVal);
  History.prototype.replaceState.call(
    window.history,
    window.history.state,
    "",
    `${url.pathname}${url.search}`,
  );
}

/**
 * Drop incoming cars whose id is already loaded. Keyset pages can overlap when a
 * row's sort_id shifts between fetches (listings churn constantly); a duplicate
 * id would collide as the card's React key and corrupt the contiguous window
 * accounting. Pure — safe to call anywhere.
 */
function withoutLoaded(loaded: CarView[], incoming: CarView[]): CarView[] {
  const have = new Set<number>();
  for (const car of loaded) if (car.id !== undefined) have.add(car.id);
  return incoming.filter((car) => car.id === undefined || !have.has(car.id));
}

/**
 * Virtualized, BIDIRECTIONAL infinite-scroll grid for the catalog — FIXED-SPACE
 * architecture.
 *
 * The grid reserves space for the ENTIRE filtered feed up front: `totalCount`
 * cars → a fixed number of rows, every row at a fixed arithmetic position
 * (uniform card heights make this exact — see AuctionCard's deterministic-height
 * contract). The loaded window of cars occupies its absolute slice of that space
 * (`startCar` = the window's first car's index in the feed, seeded server-side
 * as `aboveCount` for `?after=` deep links); every cell outside the window
 * renders an in-place `SkeletonCard`.
 *
 * WHY: loading a page UPWARD only fills already-reserved space — nothing above
 * the viewport ever moves, so there is NO scroll compensation, ever. Every
 * earlier architecture compensated `scrollTop` on prepend, and every write had
 * a felt cost: it cancels an in-flight smooth-wheel glide and KILLS a trackpad
 * momentum fling (the browser treats it as user intent). Zero writes → the
 * browser owns scrolling end-to-end → buttery by construction. This also
 * deletes the content-anchor machinery, height seeding, blank-offset chunking
 * and prepend fix-ups the compensating design needed.
 *
 * Feed-churn drift (ingestion adds cars above mid-session; count under/over
 * counts) is absorbed at the FEED TOP only: an upward page that overflows the
 * reserved space drops its newest overflow cars for this session; a walk that
 * terminates early snaps `startCar` to 0. Both are ≤ a-few-cells, once, at the
 * extreme top — in exchange for pixel-stability everywhere else, always.
 *
 * Two keyset cursors bound the loaded window (`bottomCursor` down, `topCursor`
 * up; null at the feed ends). As the viewport-top card crosses rows, `?after=`
 * is rewritten (history state, no navigation) so the URL always deep-links to
 * the current position; a refresh re-seeds a window around it (`getCarsWindow`)
 * and scrolls the anchor row into place — pure arithmetic against uniform rows.
 *
 * SSR/SEO: the virtualizer renders zero rows on the server (0×0 viewport rect),
 * so until the container is measured client-side the grid renders the seeded
 * cars as a plain CSS grid — real card markup for crawlers and the LCP — then
 * swaps to the virtualized layout (identical at the top; no hydration mismatch).
 *
 * Remounted via the parent's filters `key` when filters change. `?after=`
 * changes never remount (not part of that key).
 */
export function AllCarsGrid({
  initialPage,
  initialAnchor,
  filters,
  totalCount,
  aboveCount,
}: {
  initialPage: CarsPage;
  /** sort_id of the deep-link anchor card to scroll to the top on mount, or null. */
  initialAnchor: string | null;
  filters: CarFilters;
  /** Exact filtered feed size (drives the reserved space). Search: result size. */
  totalCount: number;
  /** Cars above the seeded window in the feed — the window's absolute position. */
  aboveCount: number;
}) {
  // While a filter navigation is in flight the committed (still-visible) grid is
  // the PREVIOUS filter's results — dim + disable it so the stale cars read as
  // "updating" rather than current. Safe with no provider (hub pages): false.
  const { pending } = useFilterNav();

  const [cars, setCars] = useState<CarView[]>(initialPage.cars);
  const [bottomCursor, setBottomCursor] = useState<string | null>(initialPage.nextCursor);
  const [topCursor, setTopCursor] = useState<string | null>(initialPage.prevCursor ?? null);
  // Absolute feed index of cars[0] — pins the loaded window into the reserved
  // space. Decreases as upward pages fill in; 0 = window starts at the feed top.
  const [startCar, setStartCar] = useState(aboveCount);
  const bottomDone = bottomCursor === null;
  const topDone = topCursor === null;

  // Synchronous re-entry locks for the loaders (refs, not state: re-entry
  // safety needs no render, and the edge-trigger effect must not set state
  // synchronously). Loads re-trigger via the render the commit itself causes.
  const appendingRef = useRef(false);
  const prependingRef = useRef(false);

  // Responsive column count + scroll offset from the container (tracked in state
  // so they're never read off the ref during render). `measured` flips true once
  // the container has been laid out — it gates the swap from the static SSR grid
  // to the virtualized one, and the deep-link anchor scroll waits for it so the
  // row index is computed against the REAL column count and a settled
  // `scrollMargin`.
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [columns, setColumns] = useState(1);
  const [scrollMargin, setScrollMargin] = useState(0);
  const [headerOffset, setHeaderOffset] = useState(0);
  const [measured, setMeasured] = useState(false);
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const update = () => {
      setColumns(columnsForWidth(el.clientWidth));
      setScrollMargin(el.offsetTop);
      // The fixed header's real height (published to --header-h by SiteHeader).
      // The header ignores teleport-sized programmatic jumps (its scroll handler
      // guard), so it stays visible across a restore — the anchor card must land
      // BELOW it (`scrollPaddingStart`), and the pointer-read mirrors the same
      // line; the two MUST stay symmetric or the pointer drifts per refresh.
      setHeaderOffset(
        Number.parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--header-h")) || 0,
      );
      setMeasured(true);
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Browser-level restore off: scrollRestoration "manual" persists on the history
  // entry, so a reload never gets the browser's stale scroll restore. (Restored
  // to the previous value on unmount.) A `?after=` deep link is positioned by the
  // anchor effect below.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const prev = window.history.scrollRestoration;
    if ("scrollRestoration" in window.history) window.history.scrollRestoration = "manual";
    return () => {
      if ("scrollRestoration" in window.history) window.history.scrollRestoration = prev;
    };
  }, []);

  // BARE-URL RELOAD defence. Next's router keeps its own scroll memory and
  // re-applies it repeatedly as streamed content commits — `scrollRestoration =
  // "manual"` does not cover it (see ScrollToTop, which fights the same burst on
  // forward navigations), and our pointer `replaceState` writes make Next
  // snapshot mid-scroll positions. An ANCHORED load needs no defence
  // (scrollToIndex re-asserts its target); normal first visits and client navs
  // have no stale memory — so this runs ONLY on reload-type navigations without
  // an anchor.
  //
  // Arming rules — SIGNATURE-ONLY, deliberately conservative:
  //  - User input (wheel/touch/key/pointer) aborts everything, always.
  //  - The pin snaps ONLY an offset that was written at least TWICE (Next's
  //    restore re-applies its one remembered offset per streamed commit; real
  //    scrolling never lands on the same pixel twice), and only that offset.
  //  - Two DISTINCT increasing offsets (that aren't the burst value) = user
  //    scrolling whose input events predate our listeners → abort. This closes
  //    the hydration race where an early wheel was invisible and any
  //    "mounted-at-top means everything is stale" fast path yanked the user.
  // Any POSITIONED load (an anchor to jump to, or a deep window whose exact
  // anchor expired — the effect below still jumps to the window) defends its
  // own position via the jump's reconcile loop; the pin must also not mistake
  // that jump's repeated target writes for a stale-restore burst.
  const positionedLoad = initialAnchor !== null || aboveCount > 0;
  useEffect(() => {
    if (typeof window === "undefined" || positionedLoad) return;
    const nav = performance.getEntriesByType?.("navigation")?.[0] as
      | PerformanceNavigationTiming
      | undefined;
    if (!nav || nav.type !== "reload") return;

    let rafId = 0;
    let aborted = false;
    let burstY: number | null = null;
    let lastY = Math.round(window.scrollY);
    let increases = 0;
    const seen = new Map<number, number>();
    const start = performance.now();
    const abort = () => {
      aborted = true;
    };
    const opts: AddEventListenerOptions = { passive: true };
    window.addEventListener("wheel", abort, opts);
    window.addEventListener("touchmove", abort, opts);
    window.addEventListener("keydown", abort);
    window.addEventListener("pointerdown", abort, opts);

    const onScroll = () => {
      if (aborted) return;
      const y = Math.round(window.scrollY);
      const isBurst = burstY !== null && Math.abs(y - burstY) <= 60;
      if (y > lastY && !isBurst && y > 60) {
        increases += 1;
        if (increases >= 2) {
          aborted = true; // monotonic progression = user scrolling — stand down
          return;
        }
      }
      lastY = y;
      if (y <= 60) return;
      const n = (seen.get(y) ?? 0) + 1;
      seen.set(y, n);
      if (n >= 2) burstY = y; // same offset re-applied → the stale restore
    };
    window.addEventListener("scroll", onScroll, opts);

    const tick = () => {
      if (aborted) return;
      const y = window.scrollY;
      if (burstY !== null && y > 1 && Math.abs(y - burstY) <= 60) {
        window.scrollTo(0, 0);
      }
      if (performance.now() - start < 1200) rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);

    return () => {
      aborted = true;
      cancelAnimationFrame(rafId);
      window.removeEventListener("wheel", abort, opts);
      window.removeEventListener("touchmove", abort, opts);
      window.removeEventListener("keydown", abort);
      window.removeEventListener("pointerdown", abort, opts);
      window.removeEventListener("scroll", onScroll, opts);
    };
  }, [positionedLoad]);

  // Latest cars/startCar, readable from async continuations (a response is
  // reconciled against the state as of when it LANDS, not when it was fired).
  const carsRef = useRef(cars);
  const startCarRef = useRef(startCar);
  useEffect(() => {
    carsRef.current = cars;
    startCarRef.current = startCar;
  });

  // Reserved space. While more pages exist below, trust the server count but
  // never less than what's already loaded (+1 keeps at least one skeleton row
  // teasing the continuation if the count undercounts); once the bottom is
  // reached, the loaded end IS the feed end. Row count is clamped so the sizer
  // stays under the browsers' layout-height cap (~33.5M px in Chromium) — on a
  // 1-column phone the full 160k-car catalog would exceed it; rows past the
  // clamp are simply unreachable by scrolling, which no one does anyway.
  const loadedEnd = startCar + cars.length;
  const totalCells = bottomDone ? loadedEnd : Math.max(totalCount, loadedEnd + 1);
  const MAX_SIZER_PX = 30_000_000;
  const rowCount = Math.max(
    1,
    Math.min(Math.ceil(totalCells / columns), Math.floor(MAX_SIZER_PX / (ESTIMATED_ROW_HEIGHT + ROW_GAP))),
  );

  // Uniform row height: starts at the estimate, locked to the real value by the
  // first measured row (all rows are equal by the card's deterministic-height
  // contract). A ref — estimateSize reads it lazily on layout rebuilds.
  const estimateRef = useRef(ESTIMATED_ROW_HEIGHT);

  // True only while a positioning jump is in flight (mount → settle). Gates
  // which virtualizer-originated scroll writes are allowed — see scrollToFn
  // below. Plain top loads never allow them.
  const anchorScrollWindowRef = useRef(initialAnchor !== null || aboveCount > 0);

  // Window virtualizer over the FULL reserved row space. Default index keys are
  // correct here: a row's index is its permanent feed position (loading never
  // shifts anything), which also makes the measurement cache naturally stable.
  const virtualizer = useWindowVirtualizer({
    count: rowCount,
    estimateSize: () => estimateRef.current,
    overscan: 3,
    gap: ROW_GAP,
    scrollMargin,
    scrollPaddingStart: headerOffset,
    // The core RE-ASSERTS its cached scroll offset whenever it (re)attaches the
    // scroll element (`_willUpdate`) — and that cache is `window.scrollY` from
    // the FIRST render (hydration, ~0). A late or repeated attach then writes
    // scrollTo(0) over a user who already scrolled (observed: a double attach
    // ~1s after load yanked a 700px position to the top). This grid needs
    // exactly TWO kinds of virtualizer writes: the anchor-restore jump (its
    // scrollToIndex + reconcile loop — only while the anchor window is open)
    // and measurement adjustments (they pass `adjustments`). Everything else —
    // i.e. the attach re-assertion — is dropped.
    scrollToFn: (offset, opts, instance) => {
      if (opts.adjustments === undefined && !anchorScrollWindowRef.current) return;
      windowScroll(offset, opts, instance);
    },
  });

  const loadMore = useCallback(() => {
    if (bottomCursor === null || appendingRef.current) return;
    appendingRef.current = true;
    void (async () => {
      try {
        const next = await loadMoreCars(filters, bottomCursor);
        const fresh = withoutLoaded(carsRef.current, next.cars);
        if (fresh.length > 0) setCars((prev) => [...prev, ...fresh]);
        setBottomCursor(next.nextCursor);
      } catch {
        // Network hiccup — cursor unchanged, the next edge-trigger retries.
      } finally {
        appendingRef.current = false;
      }
    })();
  }, [filters, bottomCursor]);

  const loadPrev = useCallback(() => {
    if (topCursor === null || prependingRef.current) return;
    prependingRef.current = true;
    void (async () => {
      try {
        const page = await loadPrevCars(filters, topCursor);
        const fresh = withoutLoaded(carsRef.current, page.cars);
        const s = startCarRef.current;
        // Feed-churn drift, absorbed at the top (see header comment):
        //  - more cars came back than reserved space remains (ingestion added
        //    newer cars above since load) → keep only the `s` adjacent to the
        //    window, drop the newest overflow for this session, and stop
        //    walking up (they're unreachable without a frame shift);
        //  - the walk terminated (prevCursor null) with space left over (cars
        //    removed above since load) → snap the window to the top.
        const usable = fresh.length > s ? fresh.slice(fresh.length - s) : fresh;
        const walkedOut = (page.prevCursor ?? null) === null;
        const overflowed = fresh.length > s;
        if (usable.length > 0) {
          setCars((prev) => [...usable, ...prev]);
          setStartCar(walkedOut ? 0 : s - usable.length);
        } else if (walkedOut) {
          setStartCar(0);
        }
        setTopCursor(overflowed || walkedOut ? null : (page.prevCursor ?? null));
      } catch {
        // Network hiccup — cursor unchanged, the next edge-trigger retries.
      } finally {
        prependingRef.current = false;
      }
    })();
  }, [filters, topCursor]);

  // ── Deep-link anchor: scroll the target card's row to the top once, AFTER
  // layout is measured (real column count + settled scrollMargin). The row
  // index is absolute arithmetic (startCar + position in the window). Fires a
  // single time; `scrollPaddingStart` lands the card just below the fixed
  // header (the header's teleport guard keeps it visible across the jump), and
  // the pointer-read below mirrors the same header line — symmetric, so the
  // pointer can't drift across refresh round-trips. `anchorSettled` holds the
  // pointer writes (not the loads — loads are inert here) until the jump lands.
  const anchorSortId = initialAnchor === null ? null : Number(initialAnchor);
  const hasAnchor = anchorSortId !== null && Number.isFinite(anchorSortId);
  const didAnchorRef = useRef(false);
  const [anchorSettled, setAnchorSettled] = useState(!hasAnchor);
  useEffect(() => {
    if (didAnchorRef.current || !measured) return; // wait for real columns/offset
    let rowIndex: number | null = null;
    if (hasAnchor) {
      const carIndex = cars.findIndex((c) => c.sortId === anchorSortId);
      if (carIndex < 0) return;
      rowIndex = Math.floor((startCar + carIndex) / columns);
    } else if (aboveCount > 0) {
      // Stale pointer: the exact anchor no longer exists anywhere at/below its
      // sort position, but the seeded window still sits at its absolute depth.
      // Jump to the window's top rather than leaving the user at the top of a
      // sea of skeletons that would fill in one contiguous page at a time.
      rowIndex = Math.floor(startCar / columns);
    } else {
      return; // plain top load — nothing to position
    }
    didAnchorRef.current = true;
    // Scroll now, then once more on the next frame: the first call lands against
    // the estimated row height, the second against the measured one the first
    // pass produced, so the target settles exactly (uniform rows → no drift).
    virtualizer.scrollToIndex(rowIndex, { align: "start" });
    const target = rowIndex;
    requestAnimationFrame(() => virtualizer.scrollToIndex(target, { align: "start" }));
    // Re-enable URL pointer writes and CLOSE the positioning-write window (the
    // reconcile loop is stable well within this) once the jump lands. Scheduled
    // with a plain timeout and NO effect-cleanup: the effect re-runs when
    // `cars` grows, and a cleanup would cancel the timer every time.
    setTimeout(() => {
      anchorScrollWindowRef.current = false;
      setAnchorSettled(true);
    }, 700);
  }, [hasAnchor, anchorSortId, aboveCount, cars, columns, startCar, measured, virtualizer]);

  const items = virtualizer.getVirtualItems();

  // Lock the row-height estimate to the real measured value (single value —
  // rows are uniform; the core rounds measurements to integers). EXACT match
  // required: even a 1px estimate error would make every skeleton row that
  // fills in fire a ±1px adjustment write — and ANY programmatic write kills a
  // trackpad momentum fling. itemSizeCache is the virtualizer's public map.
  useEffect(() => {
    const sizes = Array.from(virtualizer.itemSizeCache.values()).sort((a, b) => a - b);
    if (sizes.length === 0) return;
    const median = sizes[Math.floor(sizes.length / 2)];
    if (median !== estimateRef.current) estimateRef.current = median;
  }, [items, virtualizer]);

  // Row heights are cached BY INDEX; a breakpoint change re-groups rows and
  // changes the uniform height (714–741px across layouts), so stale entries
  // from the previous layout must go. `measure()` clears the cache and lets
  // rendered rows re-measure; unrendered rows fall back to the estimate, which
  // re-locks to the new uniform height immediately after.
  const prevColumnsRef = useRef(columns);
  useEffect(() => {
    if (prevColumnsRef.current === columns) return;
    prevColumnsRef.current = columns;
    virtualizer.measure();
  }, [columns, virtualizer]);

  // Fire loads when the rendered range touches unloaded space. No direction
  // gates and no parking needed: filling reserved space moves nothing, so a
  // load can never feed back into scrolling.
  useEffect(() => {
    const first = items[0];
    const last = items[items.length - 1];
    if (!first || !last) return;
    // Unloaded cells at/above the rendered top → fill upward (once the anchor
    // jump has settled, so the initial top-of-space render doesn't fetch).
    if (anchorSettled && !topDone && !prependingRef.current && first.index * columns < startCar) {
      loadPrev();
    }
    // Rendered range within ~3 rows of the loaded end → extend downward.
    if (!bottomDone && !appendingRef.current && (last.index + 3) * columns >= loadedEnd) {
      loadMore();
    }
  }, [items, columns, startCar, loadedEnd, topDone, bottomDone, anchorSettled, loadPrev, loadMore]);

  // ── URL page-pointer: rewrite `?after=` to the sort_id of the card at the
  // VISUAL top (below the fixed-header line — the mirror of the restore's
  // `scrollPaddingStart`). Debounced: computing it per scroll frame would add
  // synchronous work to the scroll. Cleared above the grid (looking at
  // filters/hero → a refresh should restore the natural page top) and at the
  // true feed top.
  const lastPointerRef = useRef<number | null>(null);
  const pointerStateRef = useRef({ items, cars, columns, startCar, headerOffset });
  useEffect(() => {
    pointerStateRef.current = { items, cars, columns, startCar, headerOffset };
    if (!anchorSettled || items.length === 0 || cars.length === 0) return;
    const id = setTimeout(() => {
      const { items: it, cars: cs, columns: cols, startCar: sc, headerOffset: ho } = pointerStateRef.current;
      if (it.length === 0 || cs.length === 0) return;
      const scrollY = typeof window === "undefined" ? 0 : window.scrollY;
      const gridTop = containerRef.current?.offsetTop ?? 0;
      if (scrollY < gridTop) {
        if (lastPointerRef.current !== null || new URL(window.location.href).searchParams.has(AFTER_PARAM)) {
          lastPointerRef.current = null;
          writeAfterPointer(null);
        }
        return;
      }
      const topRow = it.find((r) => r.end > scrollY + ho) ?? it[it.length - 1];
      // First LOADED card of the visual-top row (edge rows can be part-skeleton).
      const g = Math.max(topRow.index * cols, sc);
      const topCard = cs[g - sc];
      if (!topCard || topCard.sortId === undefined) return; // skeleton region — keep the last pointer
      const atFeedTop = topRow.index === 0 && sc === 0;
      const nextPointer = atFeedTop ? null : topCard.sortId;
      if (nextPointer === lastPointerRef.current) return;
      lastPointerRef.current = nextPointer;
      writeAfterPointer(nextPointer);
    }, 150);
    return () => clearTimeout(id);
  }, [items, cars, columns, startCar, headerOffset, anchorSettled]);

  // Frosted-glass veil shown over the (stale) results while a filter nav is
  // pending — the visible feedback that a filter change is applying.
  //
  // It is `position: sticky` + a canceling negative margin so it costs ZERO
  // layout space (the container's `offsetTop` → scrollMargin is untouched) yet
  // pins to the viewport as you scroll. CRUCIALLY it is NOT a full-height layer:
  // the reserved row space can be ~30M px tall, and a `filter`/inset-0 blur over
  // that would force the browser to rasterize an enormous surface. A
  // viewport-sized box with `backdrop-filter` keeps the blur bounded to what's
  // actually on screen. Sits below the fixed header (`top`), above the cards
  // (z-index), and never eats clicks (`pointer-events: none`).
  const glassVeil = pending ? (
    <div
      aria-hidden
      className="pointer-events-none sticky z-5 rounded-2xl border border-white/40 bg-white/25 shadow-[inset_0_1px_0_rgba(255,255,255,0.5)] backdrop-blur-md backdrop-saturate-150"
      style={{
        top: "var(--header-h)",
        height: "calc(100dvh - var(--header-h))",
        // Cancel the sticky box's flow height so it displaces nothing.
        marginBottom: "calc(-1 * (100dvh - var(--header-h)))",
      }}
    />
  ) : null;

  // Freeze interaction with the stale cards underneath while pending. Pointer
  // events only — layout-neutral, so no virtualizer measurement is affected.
  const frozen = pending ? ("none" as const) : undefined;

  if (totalCells === 0) {
    return (
      <div className="relative" style={{ pointerEvents: frozen }}>
        {glassVeil}
        <div className="rounded-2xl border border-line bg-white px-6 py-16 text-center text-base text-muted">
          Няма налични коли по избраните филтри.
        </div>
      </div>
    );
  }

  return (
    // overflow-anchor: none — the browser's native scroll anchoring must not
    // react to skeleton→card swaps or row mounts; positions are already fixed.
    // position: relative anchors the sticky glass veil to this container (so it
    // spans only the results region, never the filter bar above) without moving
    // the container's own offsetTop.
    <div ref={containerRef} className="relative" style={{ overflowAnchor: "none", pointerEvents: frozen }}>
      {glassVeil}
      {!measured ? (
        // SSR + first client paint: a plain, CSS-responsive grid of the seeded
        // cars. This static HTML is what crawlers index (real card markup +
        // links, matching the ItemList JSON-LD) and what the LCP is measured on —
        // the virtualizer renders zero rows on the server. Swapped for the
        // virtualized branch once the container is measured after mount (the two
        // paint identically at the top; `measured` is false for the first client
        // render too, so hydration matches).
        <div className="grid grid-cols-1 gap-5 min-[560px]:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {cars.map((car, i) => (
            // Eager-load the first two cards: the LCP candidate is in the first
            // row in every column layout.
            <AuctionCard key={car.id ?? i} car={car} priority={i < 2} />
          ))}
        </div>
      ) : (
        <div style={{ height: virtualizer.getTotalSize(), position: "relative", width: "100%" }}>
          {items.map((virtualRow) => {
            const rowStart = virtualRow.index * columns;
            const cells: (CarView | null)[] = [];
            for (let c = 0; c < columns; c++) {
              const g = rowStart + c;
              if (g >= totalCells) break; // final partial row
              cells.push(g >= startCar && g < loadedEnd ? cars[g - startCar] : null);
            }
            const hasLoadedCard = cells.some((cell) => cell !== null);
            return (
              <div
                key={virtualRow.key}
                data-index={virtualRow.index}
                // Measure only rows that contain at least one REAL card: a
                // skeleton-only row's height differs from a real row's, and all
                // real rows are uniform — leaving skeleton rows on the (exact)
                // estimate keeps the layout arithmetic stable as they fill in.
                ref={hasLoadedCard ? virtualizer.measureElement : undefined}
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
                  {cells.map((car, i) =>
                    car ? (
                      // No `priority`: this branch only exists after hydration,
                      // when the static first-paint grid already loaded the LCP.
                      <AuctionCard key={car.id ?? `${virtualRow.index}-${i}`} car={car} />
                    ) : (
                      <SkeletonCard key={`s-${virtualRow.index}-${i}`} />
                    ),
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
