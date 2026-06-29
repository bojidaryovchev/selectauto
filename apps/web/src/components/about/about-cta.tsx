import { Container, Reveal } from "@/components/common";
import { InquiryButton } from "@/components/inquiry";

/** Closing CTA strip whose button opens the inquiry modal. */
export function AboutCta() {
  return (
    <section className="py-[88px] max-md:py-[58px]">
      <Container>
        <Reveal>
          <div className="flex items-center justify-between gap-[26px] rounded-[32px] bg-[linear-gradient(90deg,#111216,#1b1d24)] p-[46px] text-white shadow-[0_18px_50px_rgba(0,0,0,0.14)] max-[900px]:flex-col max-[900px]:items-start max-md:p-6">
            <div>
              <h3 className="mb-2.5 text-[clamp(28px,3vw,46px)] font-black leading-[1.04]">
                Готов ли си да намерим правилния автомобил за теб?
              </h3>
              <p className="m-0 max-w-[760px] text-lg leading-[1.8] text-white/[0.82] max-md:text-base">
                Свържи се с нас и ще изградим ясен план — от избора до доставката
                и регистрацията.
              </p>
            </div>
            <InquiryButton
              rippleTheme="light"
              className="inline-flex min-h-[54px] shrink-0 items-center justify-center rounded-full bg-gradient-to-r from-brand-dark to-brand px-[26px] text-[15px] font-extrabold text-white shadow-[0_12px_30px_rgba(216,111,22,0.25)] transition-transform duration-200 hover:-translate-y-0.5 max-[900px]:w-full"
            >
              Запитване
            </InquiryButton>
          </div>
        </Reveal>
      </Container>
    </section>
  );
}
