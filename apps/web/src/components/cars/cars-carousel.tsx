import type { CarView } from "@/types/car.type";
import { CarCardsCarousel } from "@/components/cars/car-cards-carousel";

/**
 * Homepage listings slider — the shared `CarCardsCarousel` (arrows-only header,
 * right-aligned / centered on mobile) wrapped in the `.sa-cars-slider-block` hook.
 * Renders the same catalog `AuctionCard` as /vsichki-avtomobili and the
 * detail-page `RelatedCars`, so cards look identical everywhere.
 */
export function CarsCarousel({ cars }: { cars: CarView[] }) {
  return (
    <div className="sa-cars-slider-block">
      <CarCardsCarousel cars={cars} />
    </div>
  );
}
