import Link from "next/link";
import { Container, Reveal } from "@/components/common";

/** Premium "Как работим" CTA card linking to the process page. */
export function ProcessCtaSection() {
  return (
    <section className="px-0 pb-[90px] pt-[90px] max-md:pb-14 max-md:pt-14">
      <Container>
        <Reveal>
          <div className="relative mx-auto max-w-[920px] overflow-hidden rounded-[36px] border border-black/[0.04] bg-[radial-gradient(circle_at_top,rgba(255,138,61,0.08),transparent_38%),rgba(255,255,255,0.72)] px-14 py-[84px] text-center shadow-[0_10px_40px_rgba(0,0,0,0.04),0_2px_12px_rgba(0,0,0,0.03)] backdrop-blur-lg max-md:rounded-[28px] max-md:px-[22px] max-md:py-14">
            <span className="mb-[22px] inline-flex min-h-[34px] items-center justify-center rounded-full bg-brand-glow/[0.12] px-4 text-[11px] font-extrabold uppercase tracking-[1.8px] text-[#d8661d]">
              Как работим
            </span>
            <h2 className="mb-[22px] text-[clamp(32px,4vw,58px)] font-black leading-[1.04] text-ink-strong">
              Виж целия процес от заявка до ключ
            </h2>
            <p className="mx-auto max-w-[680px] text-lg leading-[1.7] text-ink-strong/[0.68]">
              Показали сме всяка стъпка по ясен и визуален начин — от първия
              разговор до готовия автомобил.
            </p>
            <Link
              href="/proces/"
              className="mt-[38px] inline-flex min-h-[62px] items-center justify-center gap-3.5 rounded-full bg-gradient-to-br from-[#ff9b4a] via-[#f06f20] to-[#c94e0f] pl-[34px] pr-[18px] text-base font-extrabold text-white shadow-[0_14px_34px_rgba(232,108,32,0.22),inset_0_1px_0_rgba(255,255,255,0.22)] transition-transform duration-200 hover:-translate-y-[3px] max-md:w-full max-md:pl-6"
            >
              Разгледай процеса
              <span className="inline-flex h-[34px] w-[34px] items-center justify-center rounded-full bg-white/[0.18]">
                →
              </span>
            </Link>
          </div>
        </Reveal>
      </Container>
    </section>
  );
}
