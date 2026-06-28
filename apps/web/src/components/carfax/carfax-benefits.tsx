import { Container, Reveal, SectionHeader } from "@/components/common";

/** "Защо Carfax" — three benefit cards. */
export function CarfaxBenefits() {
  return (
    <section className="py-[88px] max-md:py-[58px]">
      <Container>
        <SectionHeader
          eyebrow="Защо Carfax"
          title="По-малко риск. По-добро решение."
          subtitle="Проверка, която ти дава повече сигурност и спокойствие преди покупка."
          className="mb-[42px] max-w-[920px]"
        />

        <div className="grid grid-cols-3 gap-6 max-[1100px]:grid-cols-1">
          <Reveal>
            <article className="h-full min-h-[280px] rounded-[28px] bg-[linear-gradient(135deg,#0e1014,#181b22)] px-[26px] py-[30px] text-white shadow-card-strong transition-transform duration-200 hover:-translate-y-1.5 max-md:px-5 max-md:py-6">
              <h3 className="mb-3.5 text-[30px] font-black leading-[1.08] max-md:text-[28px]">
                История на автомобила
              </h3>
              <p className="m-0 text-[17px] leading-[1.85] max-md:text-base">
                Виж важни записи за регистрация, пробег, собственост и други
                ключови данни.
              </p>
            </article>
          </Reveal>

          <Reveal delay={0.08}>
            <article className="h-full min-h-[280px] rounded-[28px] bg-[linear-gradient(135deg,#c45c00,#df7a10)] px-[26px] py-[30px] text-white shadow-card-strong transition-transform duration-200 hover:-translate-y-1.5 max-md:px-5 max-md:py-6">
              <h3 className="mb-3.5 text-[30px] font-black leading-[1.08] max-md:text-[28px]">
                По-сигурна покупка
              </h3>
              <p className="m-0 text-[17px] leading-[1.85] max-md:text-base">
                Намаляваш риска от скрити проблеми и взимаш решение с повече
                яснота.
              </p>
            </article>
          </Reveal>

          <Reveal delay={0.16}>
            <article className="h-full min-h-[280px] rounded-[28px] bg-white px-[26px] py-[30px] text-[#17181b] shadow-card-strong transition-transform duration-200 hover:-translate-y-1.5 max-md:px-5 max-md:py-6">
              <h3 className="mb-3.5 text-[30px] font-black leading-[1.08] max-md:text-[28px]">
                Бързо запитване
              </h3>
              <p className="m-0 text-[17px] leading-[1.85] max-md:text-base">
                Изпрати VIN и основни данни, а ние ще се свържем с теб възможно
                най-скоро.
              </p>
            </article>
          </Reveal>
        </div>
      </Container>
    </section>
  );
}
