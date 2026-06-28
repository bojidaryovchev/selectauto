import { BrandsGrid } from "@/components/cars";
import { Container, Reveal, SectionHeader } from "@/components/common";

/** "Популярни марки" — section header + the brand-logo grid. */
export function PopularBrandsSection() {
  return (
    <section className="bg-[#fafafa] py-[78px] max-md:py-14">
      <Container>
        <SectionHeader
          eyebrow="Популярни марки"
          title="Започни от марката, която търсиш"
          subtitle="След като потребителят вече е видял подхода ни и реални автомобили, това е точният момент да навлезе по марки."
        />
      </Container>

      <Reveal>
        <BrandsGrid />
      </Reveal>
    </section>
  );
}
