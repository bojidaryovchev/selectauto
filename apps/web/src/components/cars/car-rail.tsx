"use client";

import { useEffect, useRef, useState } from "react";
import { Autoplay } from "swiper/modules";
import { Swiper, SwiperSlide } from "swiper/react";
import type { Swiper as SwiperClass } from "swiper/types";
import "swiper/css";
import { AuctionCard } from "@/components/cars/all-cars/auction-card";
import { IconButton, LinkButton, SectionHeading } from "@/components/common";
import { ChevronLeftIcon, ChevronRightIcon } from "@/components/icons";
import { useMounted } from "@/hooks/use-mounted";
import { useHasPainted } from "@/lib/after-first-paint";
import type { CarView } from "@/types/car.type";

/** Autoplay delay (ms) — how fast the rail auto-advances on its own. */
const AUTOPLAY_DELAY_MS = 2000;

/**
 * How long (ms) autoplay stays off after an arrow click, so the viewer can look at the card they moved to. The window
 * restarts on every click, so browsing keeps it paused; it resumes this long after the LAST click.
 */
const AUTOPLAY_RESUME_DELAY_MS = 6000;

/**
 * Cards in view by window width, with a peek of the next one (board `hm-home`, `.hm-track`): 1,15 on a phone, 1,4 up
 * to 679 px, 2,2 on a tablet, 3,15 from 1024 px, 4,3 from 1400 px and 5,3 from 1800 px, so wide screens fill.
 */
const BASE = { slidesPerView: 1.15, spaceBetween: 16 };
const BREAKPOINTS = {
  640: { slidesPerView: 1.4, spaceBetween: 20 },
  680: { slidesPerView: 2.2, spaceBetween: 20 },
  1024: { slidesPerView: 3.15, spaceBetween: 24 },
  1400: { slidesPerView: 4.3, spaceBetween: 24 },
  1800: { slidesPerView: 5.3, spaceBetween: 24 },
};

/**
 * A rail of car cards under a section heading (boards `hm-home`, `hm-flow-cars`): the eyebrow, the title and the
 * lead; on tablets and desktops „Вижте всички …" and the arrows on the right; on a phone the arrows in the eyebrow
 * row and „Вижте всички …" full width under the rail.
 *
 * Behaviour, unchanged from the carousel it replaces (`car-cards-carousel.tsx`):
 * - Auto-advances every 2 s, only while the rail is on screen (an IntersectionObserver starts and stops it), and
 *   pauses while hovered.
 * - An arrow click moves one card and holds autoplay off for 6 s.
 * - `rewind`, not `loop`: past the last card „Напред" returns to the first, so the arrows are never disabled. Swiper's
 *   loop can't navigate backwards at fractional `slidesPerView` (nolimits4web/swiper#6383); see the old carousel's
 *   note.
 * - Autoplay is added after mount: Swiper's Autoplay reads the clock at construction, which the static-shell
 *   prerender forbids, so the rail remounts once on the client (`key`) with it.
 * - The photos wait for first paint, so the lazy ones nearest the fold don't count against the page's first paint.
 *
 * The track is a list (`ul` > `li`), so a screen reader announces how many cars it holds.
 */
export function CarRail({
  eyebrow,
  title,
  titleId,
  lead,
  cars,
  moreHref,
  moreLabel,
}: {
  eyebrow: string;
  title: string;
  /** Names the section (`aria-labelledby` on the caller's `<section>`). */
  titleId: string;
  lead: string;
  cars: CarView[];
  moreHref: string;
  moreLabel: string;
}) {
  const [swiper, setSwiper] = useState<SwiperClass | null>(null);
  const resumeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inViewRef = useRef(false);
  const mounted = useMounted();
  const showImages = useHasPainted();

  // Drop a pending "resume autoplay" timer on unmount, and when the client remount swaps the Swiper instance.
  useEffect(() => {
    return () => {
      if (resumeTimerRef.current) clearTimeout(resumeTimerRef.current);
    };
  }, [swiper]);

  // Autoplay only while the rail is on screen: Swiper's Autoplay otherwise runs a frame loop and slides the track
  // every 2 s whether or not anyone can see it (it stops by itself only for a hidden tab).
  useEffect(() => {
    // `swiper.autoplay` exists only once the Autoplay module is registered (the client remount).
    if (!swiper?.autoplay) return;
    const observer = new IntersectionObserver(([entry]) => {
      inViewRef.current = entry.isIntersecting;
      if (swiper.destroyed) return;
      if (!entry.isIntersecting) swiper.autoplay.stop();
      // Not while an arrow click is holding autoplay off: its timer restarts it.
      else if (!swiper.autoplay.running && !resumeTimerRef.current) swiper.autoplay.start();
    });
    observer.observe(swiper.el);
    return () => observer.disconnect();
  }, [swiper]);

  // Arrow click: one card, then autoplay off for AUTOPLAY_RESUME_DELAY_MS. The arrows sit outside the track, so
  // Swiper's own `pauseOnMouseEnter` doesn't cover them.
  const handleNav = (direction: "prev" | "next") => {
    if (!swiper) return;
    if (direction === "prev") swiper.slidePrev();
    else swiper.slideNext();
    if (!swiper.autoplay) return;
    swiper.autoplay.stop();
    if (resumeTimerRef.current) clearTimeout(resumeTimerRef.current);
    resumeTimerRef.current = setTimeout(() => {
      resumeTimerRef.current = null;
      // Scrolled away meanwhile → stay stopped; coming back into view restarts it (see the observer above).
      if (!swiper.destroyed && inViewRef.current) swiper.autoplay?.start();
    }, AUTOPLAY_RESUME_DELAY_MS);
  };

  const arrows = (
    <>
      <IconButton label="Назад" onClick={() => handleNav("prev")}>
        <ChevronLeftIcon />
      </IconButton>
      <IconButton label="Напред" onClick={() => handleNav("next")}>
        <ChevronRightIcon />
      </IconButton>
    </>
  );

  return (
    <>
      <SectionHeading
        eyebrow={eyebrow}
        eyebrowEnd={<span className="sa-only-ph flex gap-2">{arrows}</span>}
        title={title}
        titleId={titleId}
        lead={lead}
        actions={
          <>
            <LinkButton href={moreHref} variant="sec" size="md">
              {moreLabel}
            </LinkButton>
            {arrows}
          </>
        }
        actionsClassName="sa-hide-ph"
      />

      <Swiper
        key={mounted ? "client" : "ssr"}
        onSwiper={setSwiper}
        modules={mounted ? [Autoplay] : []}
        {...BASE}
        breakpoints={BREAKPOINTS}
        grabCursor
        watchOverflow
        rewind
        autoplay={mounted ? { delay: AUTOPLAY_DELAY_MS, disableOnInteraction: false, pauseOnMouseEnter: true } : undefined}
        wrapperTag="ul"
        // Equal-height slides: Swiper's CSS makes each slide a block of its own height; as flex items of a stretched
        // row they all take the tallest card's height.
        className="[&_.swiper-slide]:flex! [&_.swiper-slide]:h-auto! [&_.swiper-wrapper]:items-stretch!"
      >
        {cars.map((car, i) => (
          <SwiperSlide key={car.id ?? car.href + i} tag="li">
            <AuctionCard car={car} deferImage={!showImages} />
          </SwiperSlide>
        ))}
      </Swiper>

      <LinkButton href={moreHref} variant="sec" block className="sa-only-ph mt-4">
        {moreLabel}
      </LinkButton>
    </>
  );
}
