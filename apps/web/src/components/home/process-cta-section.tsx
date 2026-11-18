import { LinkButton, Reveal } from "@/components/common";
import { ArrowRightIcon } from "@/components/icons";

/** „Как работим" — a band leading to the process page (board `hm-home`). */
export function ProcessCtaSection() {
  return (
    <section className="sa-band sa-band--s1" aria-labelledby="hm-proc-t">
      <div className="sa-wrap flex flex-wrap items-end justify-between gap-x-16 gap-y-8">
        <Reveal className="sa-stack max-w-260 gap-4.5">
          <span className="sa-eyebrow">Как работим</span>
          <h2 id="hm-proc-t" className="type-h1 max-w-[20ch]">
            Вижте целия процес от заявка до ключ
          </h2>
          <p className="sa-lead">
            Показали сме всяка стъпка по ясен и визуален начин — от първия разговор до готовия автомобил.
          </p>
        </Reveal>
        <LinkButton href="/proces" variant="pri" size="xl" className="w-full sm:w-auto">
          Разгледайте процеса
          <ArrowRightIcon />
        </LinkButton>
      </div>
    </section>
  );
}
