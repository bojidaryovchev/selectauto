import { LinkButton, Reveal, SectionHeading } from "@/components/common";
import { ArrowRightIcon } from "@/components/icons";
import { PROCESS_STEPS } from "@/data/process";

/**
 * Compact, crawlable version of the 5-step import process on the About page (board `in-za-nas`).
 * Shares the canonical `PROCESS_STEPS` data with `/proces` (the full interactive
 * 3D experience), and links there. This is the section that gives the page its
 * substance — it absorbs the scattered "what we do" bullets into real structure.
 */
export function AboutProcess() {
  return (
    <section className="sa-band">
      <div className="sa-wrap">
        <SectionHeading
          eyebrow="Как работим"
          title="От заявка до ключ — в пет стъпки"
          lead="Всяка стъпка е структурирана така, че да получите автомобила сигурно, прозрачно и без скрити изненади."
        />
        <ol className="in-steps">
          {PROCESS_STEPS.map((step, i) => (
            <Reveal as="li" key={step.num} delay={0.06 * i}>
              <b>{step.num}</b>
              <div className="sa-stack gap-2">
                <h3>{step.title}</h3>
                <p className="sa-p">{step.desc}</p>
              </div>
            </Reveal>
          ))}
        </ol>
        <div className="in-more">
          <LinkButton href="/proces" variant="sec" size="xl">
            Разгледайте целия процес
            <ArrowRightIcon />
          </LinkButton>
        </div>
      </div>
    </section>
  );
}
