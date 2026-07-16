import { Container, LinkButton, Reveal, SectionHeader } from "@/components/common";
import { ArrowRightIcon } from "@/components/icons";
import { PROCESS_STEPS } from "@/data/process";

/**
 * Compact, crawlable version of the 5-step import process on the About page.
 * Shares the canonical `PROCESS_STEPS` data with `/proces` (the full interactive
 * 3D experience), and links there. This is the section that gives the page its
 * substance — it absorbs the scattered "what we do" bullets into real structure.
 */
export function AboutProcess() {
  return (
    <section className="bg-white py-22 max-md:py-14.5">
      <Container>
        <SectionHeader
          eyebrow="Как работим"
          title="От заявка до ключ — в пет стъпки"
          subtitle="Всяка стъпка е структурирана така, че да получиш автомобила сигурно, прозрачно и без скрити изненади."
          className="mb-14"
        />

        <ol className="grid grid-cols-5 gap-4 max-[1100px]:grid-cols-1">
          {PROCESS_STEPS.map((step, i) => (
            <Reveal key={step.num} delay={0.06 * i}>
              <li className="flex h-full flex-col rounded-3xl border border-line bg-[#fafafa] p-6 transition-transform duration-300 hover:-translate-y-1.5 max-[1100px]:flex-row max-[1100px]:items-start max-[1100px]:gap-5">
                <span className="mb-4 inline-flex size-11 items-center justify-center rounded-2xl bg-brand/12 text-lg font-black tabular-nums text-brand-dark max-[1100px]:mb-0 max-[1100px]:shrink-0">
                  {step.num}
                </span>
                <div>
                  <h3 className="mb-2 text-xl font-extrabold text-ink">
                    {step.title}
                  </h3>
                  <p className="m-0 text-sm leading-[1.7] text-[#5a5d64]">
                    {step.desc}
                  </p>
                </div>
              </li>
            </Reveal>
          ))}
        </ol>

        <Reveal className="mt-11 flex justify-center">
          <LinkButton
            href="/proces"
            rippleTheme="dark"
            className="inline-flex min-h-13.5 items-center justify-center gap-2.5 rounded-full border border-black/8 bg-white px-7 text-[15px] font-extrabold text-ink shadow-card transition-transform duration-200 hover:-translate-y-0.5"
          >
            Разгледай целия процес
            <ArrowRightIcon className="size-4.5 text-brand-dark" />
          </LinkButton>
        </Reveal>
      </Container>
    </section>
  );
}
