import { Container, Reveal, SectionHeader } from "@/components/common";
import { PILLARS } from "@/data/home";

/** "Защо SelectAuto" — three-pillar value proposition. */
export function WhyUsSection() {
  return (
    <section className="py-[78px] max-md:py-14">
      <Container>
        <SectionHeader
          eyebrow="Защо SelectAuto"
          title="Ние не просто продаваме автомобили. Ние управляваме целия процес."
          subtitle="В нашия бранш резултатът идва от правилни решения, опит и добра преценка. Затова работим така, че клиентът да получи не просто кола, а увереност, че е стигнал до правилния избор."
        />

        <div className="grid grid-cols-3 gap-6 max-[1100px]:grid-cols-1">
          {PILLARS.map((pillar, i) => (
            <Reveal key={pillar.title} delay={0.08 * (i + 1)}>
              <div className="h-full rounded-card border border-line bg-white px-6 py-7 text-left shadow-card">
                <div className="mb-[18px] flex h-[60px] w-[60px] items-center justify-center rounded-[18px] bg-brand/[0.12] text-[28px] text-brand-dark">
                  {pillar.icon}
                </div>
                <h3 className="mb-2.5 text-[23px] font-black text-ink">
                  {pillar.title}
                </h3>
                <p className="m-0 text-[15px] leading-[1.75] text-[#555]">
                  {pillar.text}
                </p>
              </div>
            </Reveal>
          ))}
        </div>
      </Container>
    </section>
  );
}
