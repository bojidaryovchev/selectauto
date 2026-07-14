import { Container, LinkButton, Reveal } from "@/components/common";

/** Premium "Как работим" CTA card linking to the process page. */
export function ProcessCtaSection() {
  return (
    <section className="px-0 py-22.5 max-md:py-14">
      <Container>
        <Reveal>
          <div className="relative mx-auto max-w-230 overflow-hidden rounded-[36px] border border-black/4 bg-[radial-gradient(circle_at_top,rgba(255,138,61,0.08),transparent_38%),rgba(255,255,255,0.72)] px-14 py-21 text-center shadow-[0_10px_40px_rgba(0,0,0,0.04),0_2px_12px_rgba(0,0,0,0.03)] backdrop-blur-lg max-md:rounded-[28px] max-md:px-5.5 max-md:py-14">
            <span className="mb-5.5 inline-flex min-h-8.5 items-center justify-center rounded-full bg-brand-glow/12 px-4 text-[11px] font-extrabold uppercase tracking-[1.8px] text-[#d8661d]">
              Как работим
            </span>
            <h2 className="mb-5.5 text-[clamp(32px,4vw,58px)] font-black leading-[1.04] text-ink-strong">
              Виж целия процес от заявка до ключ
            </h2>
            <p className="mx-auto max-w-170 text-lg leading-[1.7] text-ink-strong/68">
              Показали сме всяка стъпка по ясен и визуален начин — от първия
              разговор до готовия автомобил.
            </p>
            <LinkButton
              href="/proces/"
              rippleTheme="light"
              className="mt-9.5 inline-flex min-h-15.5 items-center justify-center gap-3.5 rounded-full bg-linear-to-br from-[#ff9b4a] via-[#f06f20] to-[#c94e0f] pl-8.5 pr-4.5 text-base font-extrabold text-white shadow-[0_14px_34px_rgba(232,108,32,0.22),inset_0_1px_0_rgba(255,255,255,0.22)] transition-transform duration-200 hover:-translate-y-0.75 max-md:w-full max-md:pl-6"
            >
              Разгледай процеса
              <span className="inline-flex size-8.5 items-center justify-center rounded-full bg-white/18">
                →
              </span>
            </LinkButton>
          </div>
        </Reveal>
      </Container>
    </section>
  );
}
