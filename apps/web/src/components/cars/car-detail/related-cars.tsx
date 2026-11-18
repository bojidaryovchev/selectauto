import { CarRail } from "@/components/cars/car-rail";
import type { CarView } from "@/types/car.type";

/**
 * „Подобни автомобили" — same-model (else same-brand) active cars at the bottom of the car page (boards `cd-*`): a
 * `CarRail` with the title and its controls on one row, gliding freely with a drag (`freeMode`, as before). Renders
 * nothing when there are no related cars.
 */
export function RelatedCars({ cars }: { cars: CarView[] }) {
  if (cars.length === 0) return null;

  return (
    <section className="sa-band sa-band--line sa-band--tight" aria-labelledby="cd-rel-h">
      <div className="sa-wrap">
        <CarRail title="Подобни автомобили" titleId="cd-rel-h" cars={cars} freeMode />
      </div>
    </section>
  );
}
