"use client";

import { useRef } from "react";
import { Autoplay, Navigation } from "swiper/modules";
import { Swiper, SwiperSlide } from "swiper/react";
import type { Swiper as SwiperClass } from "swiper/types";
import "swiper/css";
import "swiper/css/navigation";
import type { CarView } from "@/types/car.type";
import { CarouselNav } from "@/components/common";
import { AuctionCard } from "@/components/cars/all-cars/auction-card";
import { useMounted } from "@/hooks/use-mounted";

/**
 * Listing carousel — renders the same catalog `AuctionCard` as
 * /vsichki-avtomobili (and the detail-page `RelatedCars` slider), so cards look
 * identical everywhere. Density mirrors `RelatedCars` (peek on mobile, ~2 / ~3
 * per view up-breakpoints) since the auction card is denser than the old
 * image-hero card. Auto-advances every 2s (pauses on hover, resumes after a
 * manual swipe) and rewinds to the first slide at the end; arrows are the shared
 * `CarouselNav`. (`rewind`, not `loop` — loop's DOM clones trip React's
 * reconciliation with "removeChild" errors; rewind is clone-free.)
 */
export function CarsCarousel({ cars }: { cars: CarView[] }) {
  // External arrows live outside <Swiper>, so wire them via refs (useSwiper only
  // works for children *inside* Swiper).
  const prevRef = useRef<HTMLButtonElement | null>(null);
  const nextRef = useRef<HTMLButtonElement | null>(null);

  // Swiper's Autoplay module calls `new Date()` at construction, which Next's
  // cacheComponents (PPR) forbids during the static-shell prerender of a client
  // component. Autoplay is a purely client-side enhancement, so we exclude the
  // module during SSR and add it only after mount — the `key` remounts Swiper
  // once on the client so it reconstructs WITH Autoplay (modules are fixed at
  // construction; changing the prop alone won't register it). Cards still SSR
  // (SEO/LCP intact); the slider just starts auto-advancing post-hydration.
  const mounted = useMounted();

  return (
    <div className="sa-cars-slider-block">
      {/* Arrows row — right-aligned on desktop, centered on mobile. */}
      <div className="mb-5.5 flex items-center justify-end gap-3 max-md:justify-center">
        <CarouselNav ref={prevRef} side="left" />
        <CarouselNav ref={nextRef} side="right" />
      </div>

      <Swiper
        key={mounted ? "client" : "ssr"}
        modules={mounted ? [Autoplay, Navigation] : [Navigation]}
        slidesPerView={1.15}
        spaceBetween={16}
        grabCursor
        watchOverflow
        rewind
        autoplay={mounted ? { delay: 2000, disableOnInteraction: false, pauseOnMouseEnter: true } : undefined}
        breakpoints={{
          560: { slidesPerView: 2.2, spaceBetween: 20 },
          1024: { slidesPerView: 3.3, spaceBetween: 24 },
        }}
        onBeforeInit={(swiper: SwiperClass) => {
          // Attach our ref'd buttons before Swiper initialises navigation.
          if (
            swiper.params.navigation &&
            typeof swiper.params.navigation !== "boolean"
          ) {
            swiper.params.navigation.prevEl = prevRef.current;
            swiper.params.navigation.nextEl = nextRef.current;
          }
        }}
        // Equal-height slides for the auction card (see RelatedCars for the full
        // rationale): Swiper's bundled CSS collapses each slide to content height,
        // so we force each slide to a flex column of height:auto and let the
        // wrapper's align-items:stretch size every slide to the tallest row. The
        // card's wide/orange box-shadows bleed past the Swiper's clipped overflow
        // (the hard "cutoff" edge) — drop them here; the card border delineates.
        className="[&_.swiper-wrapper]:items-stretch! [&_.swiper-slide]:flex! [&_.swiper-slide]:h-auto! [&_.swiper-slide]:flex-col! [&_article]:shadow-none! [&_article:hover]:shadow-none! [&_a.w-full]:shadow-none!"
      >
        {cars.map((car, i) => (
          <SwiperSlide key={car.id ?? car.href + i}>
            <AuctionCard car={car} />
          </SwiperSlide>
        ))}
      </Swiper>
    </div>
  );
}
