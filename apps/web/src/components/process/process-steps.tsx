import { PROCESS_STEPS } from "@/data/process";

/**
 * Server-rendered, crawlable version of the 5-step import process (boards `in-proces`, `in-proces-nogl`). The headline
 * experience on `/proces` is a WebGL canvas (`ParticleProcess`) whose step text is animated and JS-gated — not
 * reliably indexable. This block renders the same content as plain, semantic HTML (a real `<h1>` + an ordered list of
 * steps) so search engines, AI crawlers and no-JS users get the full process. Targets the "как се внася кола / процес
 * на внос" authority cluster (docs/12-web-seo-strategy.md §3).
 */
export function ProcessSteps() {
  return (
    <section className="sa-band">
      <div className="sa-wrap">
        <div className="in-intro-h">
          <span className="sa-eyebrow">Процесът на внос</span>
          <h1 className="type-h1">Пет стъпки, един резултат</h1>
          <p className="sa-lead">
            Вносът на автомобил със SelectAuto е структуриран процес — от подбора до предаването на ключа поемаме всяка
            стъпка, за да получите автомобила сигурно, прозрачно и без скрити изненади.
          </p>
        </div>

        <ol className="in-steps">
          {PROCESS_STEPS.map((step) => (
            <li key={step.num}>
              <b>{step.num}</b>
              <div className="sa-stack gap-2">
                <h2>{step.title}</h2>
                <p className="sa-p">{step.desc}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
