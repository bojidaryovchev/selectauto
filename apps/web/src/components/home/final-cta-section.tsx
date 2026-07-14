import { Container, Reveal } from "@/components/common";
import { InquiryButton } from "@/components/inquiry";

/** Closing orange CTA strip that opens the inquiry modal. */
export function FinalCtaSection() {
  return (
    <section className="bg-[linear-gradient(90deg,#b95200,#d86f16)] py-19.5 text-white max-md:py-14">
      <Container>
        <Reveal>
          <div className="rounded-card border border-white/20 p-10 text-center max-md:px-4.5 max-md:py-7">
            <h2 className="mb-3.5 text-[clamp(32px,4vw,56px)] font-black leading-[1.03] text-white">
              Кажи ни какъв автомобил търсиш, а ние ще изградим правилния път до
              него
            </h2>
            <p className="mx-auto mb-6 max-w-225 text-lg leading-[1.75] text-white/92">
              Работим с клиенти, които искат не просто обява, а правилен процес,
              силна селекция и уверен резултат.
            </p>
            <InquiryButton className="inline-flex min-h-13.5 items-center justify-center rounded-full bg-white px-8 text-[15px] font-extrabold text-brand-dark transition-transform duration-200 hover:-translate-y-0.5 max-md:w-full">
              Запитване
            </InquiryButton>
          </div>
        </Reveal>
      </Container>
    </section>
  );
}
