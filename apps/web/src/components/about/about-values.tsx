import { Container, Reveal, SectionHeader } from "@/components/common";
import { CheckIcon, GlobeIcon, ShieldIcon } from "@/components/icons";

/**
 * Three differentiators as icon cards. Replaces the old text-only feature cards
 * and the media "benefits" list — and promotes "Визуално проследяване" from a
 * small card buried next to the social links into a first-class value.
 */
const VALUES = [
  {
    icon: ShieldIcon,
    title: "Цялостни решения",
    text: "Надежден партньор, който опростява целия процес — от първата консултация до крайната доставка и регистрация.",
  },
  {
    icon: CheckIcon,
    title: "Проверка преди наддаване",
    text: "Encar диагностика и снимки, плюс Carfax/VIN проверка — виждаш реалното състояние на автомобила, преди да наддаваме за теб.",
  },
  {
    icon: GlobeIcon,
    title: "Актуална пазарна информация",
    text: "Реални данни от аукционите в Корея, САЩ и Канада, за да купуваш стратегически и в правилния момент.",
  },
];

/** "Защо да ни се довериш" — three value cards on the light page background. */
export function AboutValues() {
  return (
    <section className="py-22 max-md:py-14.5">
      <Container>
        <SectionHeader
          eyebrow="Защо да ни се довериш"
          title="Експертна преценка, прозрачност и пълен контрол"
          subtitle="Не просто достъп до автомобили, а сигурност на всяка стъпка от пътя."
          className="mb-11"
        />

        <div className="grid grid-cols-3 gap-6 max-[1100px]:grid-cols-1">
          {VALUES.map((value, i) => {
            const Icon = value.icon;
            return (
              <Reveal key={value.title} delay={0.08 * (i + 1)}>
                <div className="h-full rounded-card border border-line bg-white px-7 py-8 shadow-card">
                  <div className="mb-5 flex size-15 items-center justify-center rounded-[18px] bg-brand/12 text-brand-dark">
                    <Icon className="size-7" />
                  </div>
                  <h3 className="mb-2.5 text-[23px] font-black text-ink">
                    {value.title}
                  </h3>
                  <p className="m-0 text-[15px] leading-[1.75] text-[#555]">
                    {value.text}
                  </p>
                </div>
              </Reveal>
            );
          })}
        </div>
      </Container>
    </section>
  );
}
