"use client";

import { useRef } from "react";
import { Navigation } from "swiper/modules";
import { Swiper, SwiperSlide } from "swiper/react";
import type { Swiper as SwiperClass } from "swiper/types";
import "swiper/css";
import "swiper/css/navigation";
import type { CarView } from "@/types/car.type";
import { CarCard } from "@/components/cars/car-card";

/**
 * Listing carousel — ports the site's `.sa-home-swiper` Swiper setup
 * (front-page.php markup + theme.js config): peek of 1.1 on mobile, 2 per view
 * from 768px, custom orange ‹ › arrows above the slider.
 */
export function CarsCarousel({ cars }: { cars: CarView[] }) {
  // External arrows live outside <Swiper>, so wire them via refs (useSwiper only
  // works for children *inside* Swiper).
  const prevRef = useRef<HTMLButtonElement | null>(null);
  const nextRef = useRef<HTMLButtonElement | null>(null);

  return (
    <div className="sa-cars-slider-block">
      {/* Arrows row — right-aligned on desktop, centered on mobile. */}
      <div className="mb-[22px] flex items-center justify-end gap-3 max-md:justify-center">
        <button
          ref={prevRef}
          type="button"
          aria-label="Назад"
          className="sa-cars-arrow grid h-14 w-14 place-items-center rounded-full bg-gradient-to-br from-brand-dark to-brand text-3xl leading-none text-white shadow-[0_14px_30px_rgba(216,111,22,0.24)] transition-[transform,box-shadow] duration-200 hover:-translate-y-0.5 hover:scale-[1.03] hover:shadow-[0_18px_34px_rgba(216,111,22,0.30)] disabled:cursor-not-allowed disabled:opacity-45 disabled:shadow-none max-lg:h-[50px] max-lg:w-[50px] max-lg:text-[26px] max-md:h-[46px] max-md:w-[46px] max-md:text-2xl"
        >
          ‹
        </button>
        <button
          ref={nextRef}
          type="button"
          aria-label="Напред"
          className="sa-cars-arrow grid h-14 w-14 place-items-center rounded-full bg-gradient-to-br from-brand-dark to-brand text-3xl leading-none text-white shadow-[0_14px_30px_rgba(216,111,22,0.24)] transition-[transform,box-shadow] duration-200 hover:-translate-y-0.5 hover:scale-[1.03] hover:shadow-[0_18px_34px_rgba(216,111,22,0.30)] disabled:cursor-not-allowed disabled:opacity-45 disabled:shadow-none max-lg:h-[50px] max-lg:w-[50px] max-lg:text-[26px] max-md:h-[46px] max-md:w-[46px] max-md:text-2xl"
        >
          ›
        </button>
      </div>

      <Swiper
        modules={[Navigation]}
        slidesPerView={1.1}
        spaceBetween={14}
        grabCursor
        watchOverflow
        breakpoints={{
          768: { slidesPerView: 2, spaceBetween: 20 },
          1024: { slidesPerView: 2, spaceBetween: 24 },
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
      >
        {cars.map((car, i) => (
          <SwiperSlide key={car.title + i} className="h-auto">
            <CarCard car={car} />
          </SwiperSlide>
        ))}
      </Swiper>
    </div>
  );
}
