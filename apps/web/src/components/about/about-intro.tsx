import { Container, Reveal, SectionHeader } from "@/components/common";

/** "Кои сме ние" intro band. */
export function AboutIntro() {
  return (
    <section className="bg-[linear-gradient(180deg,#f7f7f8_0%,#f1f2f5_100%)] py-[88px] max-md:py-[58px]">
      <Container>
        <SectionHeader
          eyebrow="Кои сме ние"
          title="Разумна покупка. Прозрачен процес. Сигурен резултат."
          subtitle="Създаваме усещане за спокойствие, яснота и контрол в една сложна покупка."
          className="mb-11 max-w-[920px]"
        />

        <Reveal delay={0.08}>
          <p className="mx-auto max-w-[980px] text-center text-xl font-medium leading-[1.95] text-[#3d4046] max-md:text-base">
            <strong className="text-[#17181b]">
              В SelectAuto вярваме, че покупката на автомобил трябва да бъде
              разумно, прозрачно и сигурно решение.
            </strong>{" "}
            Ние намираме колата, която търсиш, управляваме целия процес и ти
            спестяваме хаоса, риска и загубата на време.
          </p>
        </Reveal>
      </Container>
    </section>
  );
}
