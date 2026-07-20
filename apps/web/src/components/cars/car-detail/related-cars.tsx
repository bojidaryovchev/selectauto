import { CarCardsCarousel } from "@/components/cars/car-cards-carousel";
import type { CarView } from "@/types/car.type";

/**
 * "Подобни автомобили" — same-model (else same-brand) active cars at the bottom of
 * the detail page. The shared `CarCardsCarousel` with a titled header and
 * `freeMode` (no snapping — the row flows with the drag/wheel). Renders nothing
 * when there are no related cars.
 */
export function RelatedCars({ cars }: { cars: CarView[] }) {
  if (cars.length === 0) return null;

  return (
    <section className="mt-12">
      <CarCardsCarousel
        cars={cars}
        title="Подобни автомобили"
        freeMode
        headerClassName="mb-5"
        spaceBetween={{ base: 20, sm: 20, lg: 20 }}
      />
    </section>
  );
}
