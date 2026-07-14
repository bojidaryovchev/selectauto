import type { Ref } from "react";
import { Button } from "@/components/common/button";
import { ChevronLeftIcon, ChevronRightIcon } from "@/components/icons";

/**
 * Circular prev/next arrow for the car Swipers (homepage `CarsCarousel` +
 * detail-page `RelatedCars`), so both sliders share one arrow style: a white,
 * bordered button with a properly centred chevron SVG (`grid place-items-center`),
 * turning brand-orange on hover. Swiper toggles `swiper-button-disabled` at the
 * track ends (non-loop sliders) — we fade + disable it via that class. Wired to
 * Swiper by `ref` (Navigation reads prevEl/nextEl in `onBeforeInit`).
 */
export function CarouselNav({ ref, side }: { ref: Ref<HTMLButtonElement>; side: "left" | "right" }) {
  return (
    <Button
      ref={ref}
      aria-label={side === "left" ? "Назад" : "Напред"}
      className="grid size-11 place-items-center rounded-full border border-line bg-white text-ink shadow-card transition hover:-translate-y-0.5 hover:border-brand hover:text-brand-dark [&.swiper-button-disabled]:pointer-events-none [&.swiper-button-disabled]:opacity-40"
    >
      {side === "left" ? <ChevronLeftIcon className="size-5" /> : <ChevronRightIcon className="size-5" />}
    </Button>
  );
}
