import { Reveal, SectionHeading } from "@/components/common";
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
    text: "Encar диагностика и снимки, плюс Carfax/VIN проверка — виждате реалното състояние на автомобила, преди да наддаваме за вас.",
  },
  {
    icon: GlobeIcon,
    title: "Актуална пазарна информация",
    text: "Реални данни от аукционите в Корея, САЩ и Канада, за да купувате стратегически и в правилния момент.",
  },
];

/** „Защо да ни се доверите" (board `in-za-nas`): three value cards with icon tiles. */
export function AboutValues() {
  return (
    <section className="sa-band sa-band--line">
      <div className="sa-wrap">
        <SectionHeading
          eyebrow="Защо да ни се доверите"
          title="Експертна преценка, прозрачност и пълен контрол"
          lead="Не просто достъп до автомобили, а сигурност на всяка стъпка от пътя."
        />
        <div className="sa-grid sa-grid--3">
          {VALUES.map((value, i) => {
            const Icon = value.icon;
            return (
              <Reveal key={value.title} delay={0.08 * (i + 1)} className="grid">
                <article className="sa-pnl in-val">
                  <span className="sa-pnl__ic">
                    <Icon />
                  </span>
                  <h3 className="type-h3">{value.title}</h3>
                  <p className="sa-p">{value.text}</p>
                </article>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}
