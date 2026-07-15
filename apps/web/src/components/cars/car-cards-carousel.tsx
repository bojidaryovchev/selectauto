"use client";

import { useEffect, useRef, useState } from "react";
import { Autoplay, FreeMode } from "swiper/modules";
import { Swiper, SwiperSlide } from "swiper/react";
import type { Swiper as SwiperClass } from "swiper/types";
import "swiper/css";
import "swiper/css/free-mode";
import { AuctionCard } from "@/components/cars/all-cars/auction-card";
import { CarouselNav } from "@/components/common";
import { useMounted } from "@/hooks/use-mounted";
import type { CarView } from "@/types/car.type";

/**
 * Equal-height slides for the auction card. Swiper's bundled CSS sets
 * `.swiper-slide` to `display:block; height:100%`, which (a) defeats a plain
 * `flex` utility and (b) collapses each slide to its content height. We override
 * with `!important` (the `!` suffix) so each slide becomes a flex COLUMN of
 * `height:auto`; the wrapper's `align-items:stretch` then sizes every slide to
 * the tallest row and the card's `mt-auto` footer pins the CTA down. The card's
 * wide/orange box-shadows bleed past the Swiper's clipped overflow (the hard
 * "cutoff" edge), so we drop them here — the card border delineates.
 */
const EQUAL_HEIGHT_SLIDE_CLASSES =
  "[&_.swiper-wrapper]:items-stretch! [&_.swiper-slide]:flex! [&_.swiper-slide]:h-auto! [&_.swiper-slide]:flex-col! [&_article]:shadow-none! [&_article:hover]:shadow-none! [&_a.w-full]:shadow-none!";

/** Autoplay delay (ms) — how fast the slider auto-advances on its own. */
const AUTOPLAY_DELAY_MS = 2000;

/**
 * How long (ms) to hold autoplay off after an arrow click, so the viewer can
 * actually look at the card they navigated to before it auto-scrolls again. ~3×
 * the auto cadence: long enough to read a card, short enough the slider doesn't
 * feel dead. The window resets on every click (see `handleNav`), so continuous
 * browsing keeps it paused and autoplay only resumes this long after the LAST
 * click.
 */
const AUTOPLAY_RESUME_DELAY_MS = 6000;

/**
 * Extra slides Swiper keeps buffered on each side of the active one in `loop`
 * mode. Swiper's default `loopedSlides` is just `slidesPerGroup` (= 1 here), which
 * is FATALLY too small at our `slidesPerView` (up to 3.3): after a few `slideNext`
 * calls the active slide reaches the track's hard `maxTranslate` and every further
 * click advances `realIndex` but pins `translate` in place — the row visually
 * freezes until a manual drag re-centers it (the exact "arrows do nothing until I
 * drag" bug). Bumping the buffer to `slidesPerGroup + 3 = 4` (≈ ceil(3.3)) keeps
 * the active slide centered with slides to spare on both ends, so the loop
 * advances forever. Verified stuck-free over 20+ clicks at 1280px via Chrome CDP.
 */
const LOOP_ADDITIONAL_SLIDES = 3;

/**
 * Minimum cards before we switch on the infinite `loop`. Swiper needs
 * `slides.length ≥ ceil(slidesPerView) + loopedSlides` or loop malfunctions; at the
 * densest breakpoint that's `ceil(3.3) + (1 + LOOP_ADDITIONAL_SLIDES) = 8`, plus a
 * spare = 9. Empirically, 8 slides still freeze at the boundary while 9 loop
 * cleanly (verified at 1280px via Chrome CDP), so 9 is the hard floor. Shorter
 * lists (e.g. the DB-down fallback's 6 cars, or a detail page with few related
 * cars) fall back to `rewind` — snap back to the first card at the end — which is
 * always stuck-free. Homepage sections now fetch 12 to sit comfortably above this.
 */
const LOOP_MIN_SLIDES = 9;

interface Props {
  cars: CarView[];
  /**
   * When set, the header shows this title on the left with the nav arrows on the
   * right (detail-page "Подобни автомобили" layout). Omit it and the arrows sit
   * alone, right-aligned / centered on mobile (homepage layout).
   */
  title?: string;
  /** FreeMode = no snapping; the row flows with the drag/wheel (detail page). */
  freeMode?: boolean;
  /** Header bottom margin (homepage uses `mb-5.5`, the detail page `mb-5`). */
  headerClassName?: string;
  /** Gap between slides per breakpoint (base / ≥560px / ≥1024px). */
  spaceBetween?: { base: number; sm: number; lg: number };
}

/**
 * Shared Swiper carousel of catalog `AuctionCard`s with circular prev/next arrows
 * above the track — the one component behind both the homepage `CarsCarousel` and
 * the detail-page `RelatedCars`, so cards and controls look identical everywhere.
 *
 * Arrows drive the slider directly: we capture the Swiper instance via `onSwiper`
 * and call `slidePrev()` / `slideNext()` on click. (The old approach wired
 * Swiper's `Navigation` module through `onBeforeInit` + refs, which depended on
 * the ref being populated at the instant `beforeInit` fired — fragile here because
 * we deliberately remount the Swiper (`key`) to add Autoplay post-hydration, so
 * `beforeInit` re-runs. `onClick` fires long after mount, when the instance is
 * always live, so navigation just works.)
 *
 * Auto-advances every 2s (pauses on hover, resumes after a manual swipe) and
 * scrolls infinitely (`loop`) so it never snaps back to the first card. Three
 * guards make `loop` safe AND functional here:
 *   1. Client-only. Swiper 12's loop MOVES real slide DOM nodes around the track
 *      (it no longer clones). If loop were live on the SSR instance, the
 *      ssr→client remount below (which adds Autoplay) would tear down a slider
 *      whose slides Swiper had reparented, and React would throw "removeChild"
 *      reconciling the teardown. Gating loop behind `mounted` — the same remount
 *      that adds Autoplay — means only the stable client instance ever loops, and
 *      the SSR shell keeps its cards in document order (SEO/LCP intact).
 *   2. Enough cards (LOOP_MIN_SLIDES = 9). Short lists fall back to `rewind` (snap
 *      to the first card at the end) — too few slides to loop without a visible gap,
 *      and Swiper would warn. With either mode the arrows never hit a disabled
 *      end state.
 *   3. A real loop buffer (`loopAdditionalSlides={LOOP_ADDITIONAL_SLIDES}`). Without
 *      it Swiper's buffer is a single slide, so after ~3 clicks the active slide
 *      hits the track's hard end and the arrows appear dead until you drag (the bug
 *      this fixes). See LOOP_ADDITIONAL_SLIDES above.
 * (`loop`/`rewind`, never `loop`'s old clone mode — clones tripped React's
 * reconciliation; the move-based loop is clone-free.)
 *
 * Swiper's Autoplay module calls `new Date()` at construction, which Next's
 * `cacheComponents` (PPR) forbids during the static-shell prerender of a client
 * component. Autoplay is a purely client-side enhancement, so we exclude the
 * module during SSR and add it only after mount — the `key` remounts Swiper once
 * on the client so it reconstructs WITH Autoplay (modules are fixed at
 * construction; changing the prop alone won't register it). Cards still SSR
 * (SEO/LCP intact); the slider just starts auto-advancing post-hydration.
 */
export function CarCardsCarousel({
  cars,
  title,
  freeMode = false,
  headerClassName = "mb-5.5",
  spaceBetween = { base: 16, sm: 20, lg: 24 },
}: Props) {
  const [swiper, setSwiper] = useState<SwiperClass | null>(null);
  const resumeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mounted = useMounted();

  const modules = [...(mounted ? [Autoplay] : []), ...(freeMode ? [FreeMode] : [])];

  // Infinite loop only on the client (see the "removeChild" note above) and only
  // with enough cards to wrap seamlessly; otherwise `rewind`. Both are stable for
  // this render — `mounted` and `cars.length` don't change mid-life on the single
  // client instance, so loop never toggles on a live slider.
  const loop = mounted && cars.length >= LOOP_MIN_SLIDES;

  // Drop any pending "resume autoplay" timer on unmount (and whenever the Swiper
  // instance is swapped out by the client remount below), so it never fires
  // against a destroyed slider.
  useEffect(() => {
    return () => {
      if (resumeTimerRef.current) clearTimeout(resumeTimerRef.current);
    };
  }, [swiper]);

  // Arrow click: step one slide, then hold autoplay off for a beat (see
  // AUTOPLAY_RESUME_DELAY_MS). The arrows sit outside the track, so Swiper's
  // `pauseOnMouseEnter` never covers this — we pause explicitly and re-arm the
  // resume timer on every click.
  const handleNav = (direction: "prev" | "next") => {
    if (!swiper) return;
    if (direction === "prev") swiper.slidePrev();
    else swiper.slideNext();

    // `swiper.autoplay` exists only once the Autoplay module is registered (client
    // only — see the mount note above); before that there's nothing to pause.
    if (!swiper.autoplay) return;
    swiper.autoplay.stop();
    if (resumeTimerRef.current) clearTimeout(resumeTimerRef.current);
    resumeTimerRef.current = setTimeout(() => {
      if (!swiper.destroyed) swiper.autoplay?.start();
    }, AUTOPLAY_RESUME_DELAY_MS);
  };

  return (
    <>
      {/* Header: optional title (left) + nav arrows (right, centered on mobile). */}
      <div
        className={`flex items-center ${title ? "justify-between gap-4" : "justify-end gap-3 max-md:justify-center"} ${headerClassName}`}
      >
        {title && (
          <h2 className="text-2xl font-black uppercase tracking-tight text-ink max-md:text-xl">{title}</h2>
        )}
        <div className={`flex shrink-0 ${title ? "gap-2.5" : "gap-3"}`}>
          <CarouselNav side="left" onClick={() => handleNav("prev")} />
          <CarouselNav side="right" onClick={() => handleNav("next")} />
        </div>
      </div>

      <Swiper
        key={mounted ? "client" : "ssr"}
        onSwiper={setSwiper}
        modules={modules}
        slidesPerView={1.15}
        spaceBetween={spaceBetween.base}
        freeMode={freeMode}
        grabCursor
        watchOverflow
        loop={loop}
        loopAdditionalSlides={typeof window !== "undefined" && window.__LAS !== undefined ? window.__LAS : LOOP_ADDITIONAL_SLIDES}
        rewind={!loop}
        autoplay={mounted ? { delay: AUTOPLAY_DELAY_MS, disableOnInteraction: false, pauseOnMouseEnter: true } : undefined}
        breakpoints={{
          560: { slidesPerView: 2.2, spaceBetween: spaceBetween.sm },
          1024: { slidesPerView: 3.3, spaceBetween: spaceBetween.lg },
        }}
        className={EQUAL_HEIGHT_SLIDE_CLASSES}
      >
        {cars.map((car, i) => (
          <SwiperSlide key={car.id ?? car.href + i}>
            <AuctionCard car={car} />
          </SwiperSlide>
        ))}
      </Swiper>
    </>
  );
}
