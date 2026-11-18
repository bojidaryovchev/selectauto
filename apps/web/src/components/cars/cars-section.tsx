import { CarRail } from "@/components/cars/car-rail";
import type { CarView } from "@/types/car.type";

/**
 * A homepage listings section (board `hm-home`): a band holding a rail of car cards under its heading, with
 * „Вижте всички …" to the catalog. `divided` draws a hairline above, between two rails in a row.
 */
export function CarsSection({
  eyebrow,
  title,
  titleId,
  subtitle,
  cars,
  ctaHref,
  ctaLabel,
  divided = false,
}: {
  eyebrow: string;
  title: string;
  /** The title's id, which names the section. */
  titleId: string;
  subtitle: string;
  cars: CarView[];
  ctaHref: string;
  ctaLabel: string;
  divided?: boolean;
}) {
  return (
    <section className={`sa-band ${divided ? "sa-band--line" : ""}`} aria-labelledby={titleId}>
      <div className="sa-wrap">
        <CarRail
          eyebrow={eyebrow}
          title={title}
          titleId={titleId}
          lead={subtitle}
          cars={cars}
          moreHref={ctaHref}
          moreLabel={ctaLabel}
        />
      </div>
    </section>
  );
}
