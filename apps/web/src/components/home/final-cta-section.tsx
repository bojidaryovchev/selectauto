import { Reveal } from "@/components/common";
import { InquiryButton } from "@/components/inquiry";

/** The closing panel that opens the inquiry (board `hm-home`). */
export function FinalCtaSection() {
  return (
    <section className="sa-band" aria-labelledby="hm-fin-t">
      <div className="sa-wrap">
        <Reveal>
          <div className="flex flex-wrap items-end justify-between gap-x-16 gap-y-8 rounded-xl border border-hair2 bg-s1 p-[clamp(28px,4.4vw,80px)]">
            <div className="sa-stack max-w-245 flex-[1_1_560px] gap-4.5">
              <h2
                id="hm-fin-t"
                className="font-display text-[clamp(26px,2.4vw+12px,52px)] leading-[1.1] font-bold tracking-[-0.02em] text-balance"
              >
                Кажете ни какъв автомобил търсите, а ние ще изградим правилния път до него
              </h2>
              <p className="sa-lead">
                Работим с клиенти, които искат не просто обява, а правилен процес, силна селекция и уверен резултат.
              </p>
            </div>
            <InquiryButton variant="pri" size="xl" className="w-full sm:w-auto">
              Запитване
            </InquiryButton>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
