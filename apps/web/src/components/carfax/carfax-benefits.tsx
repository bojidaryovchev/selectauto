import { Reveal, SectionHeading } from "@/components/common";
import { HistoryIcon, SendIcon, ShieldCheckIcon } from "@/components/icons";

const BENEFITS = [
  {
    Icon: HistoryIcon,
    title: "История на автомобила",
    text: "Вижте важни записи за регистрация, пробег, собственост и други ключови данни.",
  },
  {
    Icon: ShieldCheckIcon,
    title: "По-сигурна покупка",
    text: "Намалявате риска от скрити проблеми и взимате решение с повече яснота.",
  },
  {
    Icon: SendIcon,
    title: "Бързо запитване",
    text: "Изпратете VIN и основни данни, а ние ще се свържем с вас възможно най-скоро.",
  },
];

/** „Защо Carfax" (board `in-carfax`): three benefit panels on one surface, each with its icon. */
export function CarfaxBenefits() {
  return (
    <section className="sa-band">
      <div className="sa-wrap">
        <SectionHeading
          eyebrow="Защо Carfax"
          title={
            <>
              По-малко риск. <span className="whitespace-nowrap">По-добро</span> решение.
            </>
          }
          lead="Проверка, която ви дава повече сигурност и спокойствие преди покупка."
        />
        <div className="sa-grid sa-grid--3">
          {BENEFITS.map(({ Icon, title, text }, i) => (
            <Reveal key={title} delay={0.08 * i} className="grid">
              <article className="sa-pnl in-ben">
                <span className="sa-pnl__ic">
                  <Icon />
                </span>
                <h3 className="type-h3">{title}</h3>
                <p className="sa-p">{text}</p>
              </article>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
