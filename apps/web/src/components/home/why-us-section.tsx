import { Reveal, SectionHeading } from "@/components/common";
import { PILLARS } from "@/data/home";

/** „Защо SelectAuto" — three pillars (board `hm-home`). On a phone each icon sits beside its title. */
export function WhyUsSection() {
  return (
    <section className="sa-band" aria-labelledby="hm-why-t">
      <div className="sa-wrap">
        <Reveal>
          <SectionHeading
            eyebrow="Защо SelectAuto"
            title="Ние не просто продаваме автомобили. Ние управляваме целия процес."
            titleId="hm-why-t"
            lead="В нашия бранш резултатът идва от правилни решения, опит и добра преценка. Затова работим така, че клиентът да получи не просто кола, а увереност, че е стигнал до правилния избор."
          />
        </Reveal>

        <div className="sa-grid sa-grid--3">
          {PILLARS.map((pillar, i) => {
            const Icon = pillar.icon;
            return (
              <Reveal key={pillar.title} delay={0.08 * (i + 1)} className="flex">
                <article className="sa-pnl grid flex-1 grid-cols-[44px_minmax(0,1fr)] items-center gap-x-3.5 gap-y-3 p-[clamp(24px,2.2vw,40px)] sm:flex sm:flex-col sm:items-start sm:gap-3.5">
                  <span className="sa-pnl__ic size-11 rounded-[14px] sm:mb-1.5 sm:size-14 [&_svg]:size-6 sm:[&_svg]:size-7">
                    <Icon />
                  </span>
                  <h3 className="type-h3">{pillar.title}</h3>
                  <p className="sa-p col-span-full">{pillar.text}</p>
                </article>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}
