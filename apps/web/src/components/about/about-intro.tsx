import { Reveal } from "@/components/common";

/** „Кои сме ние" (board `in-za-nas`): the heading on the left, the paragraph on the right; stacked below 1024 px. */
export function AboutIntro() {
  return (
    <section className="sa-band">
      <div className="sa-wrap in-who">
        <div className="in-who__h">
          <span className="sa-eyebrow">Кои сме ние</span>
          <h2 className="type-h2">Разумна покупка. Прозрачен процес. Сигурен резултат.</h2>
          <p className="sa-lead">Създаваме усещане за спокойствие, яснота и контрол в една сложна покупка.</p>
        </div>
        <Reveal delay={0.08}>
          <p className="in-who__p">
            <strong>
              В SelectAuto вярваме, че покупката на автомобил трябва да бъде разумно, прозрачно и сигурно решение.
            </strong>{" "}
            Ние намираме колата, която търсите, управляваме целия процес и ви спестяваме хаоса, риска и загубата на
            време.
          </p>
        </Reveal>
      </div>
    </section>
  );
}
