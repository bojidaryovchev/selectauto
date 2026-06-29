import { Container, LinkButton, SectionHeader } from "@/components/common";
import { CarsCarousel } from "@/components/cars/cars-carousel";
import type { CarView } from "@/types/car.type";

/**
 * A homepage listings section: section header + car carousel + a centered CTA.
 * Folds the former `CarsSection`/`CarsSectionInner` pair from page.tsx into one
 * component. Pass `tinted` to render on the grey (`#fafafa`) background used by
 * the auction section.
 */
export function CarsSection({
  eyebrow,
  title,
  subtitle,
  cars,
  ctaHref,
  ctaLabel,
  tinted = false,
}: {
  eyebrow: string;
  title: string;
  subtitle: string;
  cars: CarView[];
  ctaHref: string;
  ctaLabel: string;
  tinted?: boolean;
}) {
  return (
    <section className={`py-[78px] max-md:py-14 ${tinted ? "bg-[#fafafa]" : ""}`}>
      <Container>
        <SectionHeader eyebrow={eyebrow} title={title} subtitle={subtitle} />

        <CarsCarousel cars={cars} />

        <div className="mt-7 flex justify-center">
          <LinkButton
            href={ctaHref}
            rippleTheme="dark"
            className="inline-flex min-h-[54px] items-center justify-center rounded-full border border-[#ddd] bg-white px-7 text-[15px] font-extrabold text-[#333] transition-transform duration-200 hover:-translate-y-0.5 hover:text-brand-dark"
          >
            {ctaLabel}
          </LinkButton>
        </div>
      </Container>
    </section>
  );
}
