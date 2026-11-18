import { LinkButton } from "@/components/common";
import { CarIcon } from "@/components/icons";

/**
 * A hub with no active listings (boards `hm-make-empty`, `hm-model-empty`): the panel that offers a personal
 * selection and the way to every car.
 */
export function HubEmpty({ label }: { label: string }) {
  return (
    <div className="sa-pnl hm-empty">
      <div className="sa-empty">
        <span className="sa-empty__ic">
          <CarIcon />
        </span>
        <p>
          В момента няма активни обяви за {label}. Заявете персонална селекция и ще намерим подходящ автомобил от
          аукционите.
        </p>
        <LinkButton href="/vsichki-avtomobili" variant="pri">
          Вижте всички автомобили
        </LinkButton>
      </div>
    </div>
  );
}
