import { Button } from "@/components/common/button";
import { ChevronLeftIcon, ChevronRightIcon } from "@/components/icons";

/**
 * Circular prev/next arrow for the car carousels (homepage `CarsCarousel` +
 * detail-page `RelatedCars`, both via the shared `CarCardsCarousel`), so every
 * slider shares one arrow style: a white, bordered button with a properly centred
 * chevron SVG (`grid place-items-center`), turning brand-orange on hover.
 *
 * The carousel drives the Swiper directly from `onClick` (it holds the instance),
 * so this is just a styled button — no Swiper ref wiring. `disabled` is optional
 * (the car sliders `rewind`, so their arrows never reach an end and stay active).
 */
export function CarouselNav({
  side,
  onClick,
  disabled,
}: {
  side: "left" | "right";
  onClick?: () => void;
  disabled?: boolean;
}) {
  return (
    <Button
      onClick={onClick}
      disabled={disabled}
      aria-label={side === "left" ? "Назад" : "Напред"}
      className="grid size-11 place-items-center rounded-full border border-line bg-white text-ink shadow-card transition hover:-translate-y-0.5 hover:border-brand hover:text-brand-dark disabled:pointer-events-none disabled:opacity-40"
    >
      {side === "left" ? <ChevronLeftIcon className="size-5" /> : <ChevronRightIcon className="size-5" />}
    </Button>
  );
}
