"use client";

import { useRef } from "react";
import { Autoplay, FreeMode, Navigation } from "swiper/modules";
import { Swiper, SwiperSlide } from "swiper/react";
import type { Swiper as SwiperClass } from "swiper/types";
import "swiper/css";
import "swiper/css/navigation";
import "swiper/css/free-mode";
import { AuctionCard } from "@/components/cars/all-cars/auction-card";
import { CarouselNav } from "@/components/common";
import { useMounted } from "@/hooks/use-mounted";
import type { CarView } from "@/types/car.type";

/**
 * "Подобни автомобили" — a Swiper carousel of same-model (else same-brand) active
 * cars at the bottom of the detail page, matching the legacy related-cars swiper:
 * a header (title left, circular prev/next nav right) over a free-mode, grab-to-
 * drag track with a peek of the next card. Uses the same Swiper setup as
 * `CarsCarousel` (the homepage slider). `freeMode` = no snapping, the row flows
 * with the drag/wheel. Reuses the catalog `AuctionCard`. Renders nothing empty.
 */
export function RelatedCars({ cars }: { cars: CarView[] }) {
  // External nav buttons live outside <Swiper>, wired via refs (Navigation reads
  // prevEl/nextEl in onBeforeInit — useSwiper only works for children inside).
  const prevRef = useRef<HTMLButtonElement | null>(null);
  const nextRef = useRef<HTMLButtonElement | null>(null);

  // Swiper's Autoplay module calls `new Date()` at construction, which Next's
  // cacheComponents (PPR) forbids during the static-shell prerender of a client
  // component — so we exclude the module during SSR and remount (via `key`) with
  // it on the client (see CarsCarousel for the full rationale). Cards still SSR;
  // autoplay starts post-hydration.
  const mounted = useMounted();

  if (cars.length === 0) return null;

  return (
    <section className="mt-12">
      {/* Header: title + nav (legacy related-cars-head layout) */}
      <div className="mb-5 flex items-center justify-between gap-4">
        <h2 className="text-2xl font-black uppercase tracking-tight text-ink max-md:text-xl">
          Подобни автомобили
        </h2>
        <div className="flex shrink-0 gap-2.5">
          <CarouselNav ref={prevRef} side="left" />
          <CarouselNav ref={nextRef} side="right" />
        </div>
      </div>

      {/* Free-mode Swiper: grab-to-drag, no snapping, peek of the next card. The
          shared AuctionCard's wide/orange shadows bleed in this tight layout, so we
          drop them here ([&_article]/CTA shadow-none) — the card border delineates. */}
      <Swiper
        key={mounted ? "client" : "ssr"}
        modules={mounted ? [Autoplay, FreeMode, Navigation] : [FreeMode, Navigation]}
        slidesPerView={1.15}
        spaceBetween={20}
        freeMode
        grabCursor
        watchOverflow
        rewind
        autoplay={mounted ? { delay: 2000, disableOnInteraction: false, pauseOnMouseEnter: true } : undefined}
        breakpoints={{
          560: { slidesPerView: 2.2, spaceBetween: 20 },
          1024: { slidesPerView: 3.3, spaceBetween: 20 },
        }}
        onBeforeInit={(swiper: SwiperClass) => {
          if (swiper.params.navigation && typeof swiper.params.navigation !== "boolean") {
            swiper.params.navigation.prevEl = prevRef.current;
            swiper.params.navigation.nextEl = nextRef.current;
          }
        }}
        // Equal-height slides. Swiper's own bundled CSS sets `.swiper-slide` to
        // `display:block; height:100%`, which (a) defeats a plain `flex` utility and
        // (b) collapses each slide to its content height. We override with `!important`
        // (the `!` suffix) so each slide becomes a flex COLUMN of `height:auto`; the
        // wrapper's `align-items:stretch` then makes every slide take the tallest
        // row's height, the card stretches to fill via the column's default
        // cross-axis stretch, and the card's `mt-auto` footer pins the CTA down.
        className="[&_.swiper-wrapper]:items-stretch! [&_.swiper-slide]:flex! [&_.swiper-slide]:h-auto! [&_.swiper-slide]:flex-col! [&_article:hover]:shadow-none! [&_article]:shadow-none! [&_a.w-full]:shadow-none!"
      >
        {cars.map((car) => (
          <SwiperSlide key={car.id}>
            <AuctionCard car={car} />
          </SwiperSlide>
        ))}
      </Swiper>
    </section>
  );
}
