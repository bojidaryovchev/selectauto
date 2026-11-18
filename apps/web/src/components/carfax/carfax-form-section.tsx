import { Reveal } from "@/components/common";
import { CarfaxForm } from "@/components/carfax/carfax-form";
import { CircleCheckIcon } from "@/components/icons";

const INFO_POINTS = [
  "Подходящо за автомобили от САЩ, Канада и други пазари",
  "Удобно за предварителна проверка преди покупка",
];

/**
 * The form block (board `in-carfax`): the info column (sticky on a desktop) beside the Carfax inquiry form. The third
 * point, „Запитването се записва и в нашия админ панел", is gone (owner decision 19).
 */
export function CarfaxFormSection({ id }: { id: string }) {
  return (
    <section id={id} className="sa-band sa-band--s1 scroll-mt-(--header-h)">
      <div className="sa-wrap in-form">
        <Reveal>
          <div className="in-form__info top-[calc(var(--header-h)+35px)]">
            <h2 className="type-h2">Изпратете запитване за Carfax</h2>
            <p className="sa-lead">
              Оставете ни VIN номер и данни за контакт. Ще прегледаме заявката и ще се свържем с вас за следващите
              стъпки.
            </p>
            <ul className="in-dots">
              {INFO_POINTS.map((point) => (
                <li key={point}>
                  <CircleCheckIcon />
                  {point}
                </li>
              ))}
            </ul>
          </div>
        </Reveal>

        <Reveal delay={0.08}>
          <div className="sa-pnl in-form__card bg-bg">
            <div className="in-form__head">
              <h3 className="type-h3">Форма за запитване</h3>
              <p className="sa-p">Попълнете информацията по-долу и ще се свържем с вас.</p>
            </div>
            <CarfaxForm />
          </div>
        </Reveal>
      </div>
    </section>
  );
}
