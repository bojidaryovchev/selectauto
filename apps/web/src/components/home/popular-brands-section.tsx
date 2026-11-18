import { BrandsGrid } from "@/components/cars";
import { Reveal, SectionHeading } from "@/components/common";

/** „Популярни марки" — the section heading and the make tiles (board `hm-home`). */
export function PopularBrandsSection() {
  return (
    <section className="sa-band sa-band--s1" aria-labelledby="hm-br-t">
      <div className="sa-wrap">
        <Reveal>
          <SectionHeading
            eyebrow="Популярни марки"
            title="Започнете от марката, която търсите"
            titleId="hm-br-t"
            lead="След като потребителят вече е видял подхода ни и реални автомобили, това е точният момент да навлезе по марки."
          />
        </Reveal>
        <Reveal>
          <BrandsGrid />
        </Reveal>
      </div>
    </section>
  );
}
