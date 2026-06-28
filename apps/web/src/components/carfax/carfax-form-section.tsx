import { Container, Reveal } from "@/components/common";
import { CarfaxForm } from "@/components/carfax/carfax-form";

const INFO_POINTS = [
  "Подходящо за автомобили от САЩ, Канада и други пазари",
  "Удобно за предварителна проверка преди покупка",
  "Запитването се записва и в нашия админ панел",
];

/** The form block: an info panel beside the Carfax inquiry form. */
export function CarfaxFormSection() {
  return (
    <section id="sa-carfax-form-block" className="py-[88px] max-md:py-[58px]">
      <Container>
        <div className="grid grid-cols-2 items-start gap-[26px] max-[1100px]:grid-cols-1">
          <Reveal>
            <div className="rounded-[30px] bg-[linear-gradient(135deg,#111216,#1b1d24)] px-[30px] py-[34px] text-white shadow-card-strong max-md:px-5 max-md:py-6">
              <h3 className="mb-3.5 text-[38px] font-black leading-[1.04] max-md:text-[28px]">
                Изпрати запитване за Carfax
              </h3>
              <p className="mb-[18px] text-[17px] leading-[1.85] text-white/[0.82] max-md:text-base">
                Остави ни VIN номер и данни за контакт. Ще прегледаме заявката и
                ще се свържем с теб за следващите стъпки.
              </p>
              <ul className="m-0 list-disc pl-5">
                {INFO_POINTS.map((point) => (
                  <li
                    key={point}
                    className="mb-3 text-base leading-[1.7] text-white/[0.88] last:mb-0 max-md:text-base"
                  >
                    {point}
                  </li>
                ))}
              </ul>
            </div>
          </Reveal>

          <Reveal delay={0.08}>
            <div className="rounded-[30px] bg-white px-[30px] py-[34px] shadow-card-strong max-md:px-5 max-md:py-6">
              <h3 className="mb-3 text-[34px] font-black leading-[1.06] text-[#17181b] max-md:text-[28px]">
                Форма за запитване
              </h3>
              <p className="mb-5 text-base leading-[1.75] text-[#676b73]">
                Попълни информацията по-долу и ще се свържем с теб.
              </p>
              <CarfaxForm />
            </div>
          </Reveal>
        </div>
      </Container>
    </section>
  );
}
