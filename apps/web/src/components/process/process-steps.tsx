import { Container } from "@/components/common";
import { PROCESS_STEPS } from "@/data/process";

/**
 * Server-rendered, crawlable version of the 5-step import process. The headline
 * experience on `/proces` is a WebGL canvas (`ParticleProcess`) whose step text
 * is animated and JS-gated — not reliably indexable. This block renders the same
 * content as plain, semantic HTML (a real `<h1>` + an ordered list of steps) so
 * search engines, AI crawlers and no-JS users get the full process. Targets the
 * "как се внася кола / процес на внос" authority cluster (docs/12-web-seo-strategy.md §3).
 */
export function ProcessSteps() {
  return (
    <section className="bg-white py-22 max-md:py-14.5">
      <Container className="max-w-225">
        <p className="mb-2 text-sm font-bold uppercase tracking-[0.18em] text-brand-dark">Процесът на внос</p>
        <h1 className="mb-3 text-4xl font-black uppercase tracking-tight text-ink max-md:text-3xl">
          Пет стъпки, един резултат
        </h1>
        <p className="mb-10 max-w-2xl text-[15px] leading-[1.8] text-[#3d4046]">
          Вносът на автомобил със SelectAuto е структуриран процес — от подбора до предаването на ключа поемаме всяка
          стъпка, за да получите автомобила сигурно, прозрачно и без скрити изненади.
        </p>

        <ol className="flex flex-col gap-5">
          {PROCESS_STEPS.map((step) => (
            <li
              key={step.num}
              className="flex gap-5 rounded-2xl border border-line bg-[#fafafa] p-5 max-md:flex-col max-md:gap-2"
            >
              <span className="text-2xl font-black tabular-nums text-brand-dark">{step.num}</span>
              <div>
                <h2 className="mb-1 text-xl font-extrabold text-ink">{step.title}</h2>
                <p className="text-sm/relaxed text-[#5a5d64]">{step.desc}</p>
              </div>
            </li>
          ))}
        </ol>
      </Container>
    </section>
  );
}
