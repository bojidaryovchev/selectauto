import type { CarInspection as CarInspectionData } from "@/types/car-detail.type";

/**
 * ENCAR state-inspection block (`details.inspect` + `inspect.outer`) — the
 * "Технически преглед" section. Three parts: the headline accident-summary verdicts,
 * the body-panel repair list (or an "intact" note), and the mechanical-checks grid
 * (each a green/amber dot). Present on ~35% of active ENCAR lots. Renders nothing when
 * the inspection carries no data.
 */
export function CarInspection({ inspection }: { inspection: CarInspectionData }) {
  const { summary, mechanics, panels } = inspection;
  if (summary.length === 0 && mechanics.length === 0 && panels.length === 0) return null;

  return (
    <section className="rounded-2xl border border-line bg-white p-6 shadow-card max-md:p-5">
      <h2 className="mb-5 text-lg font-black uppercase tracking-tight text-ink">Технически преглед</h2>

      {summary.length > 0 ? (
        <div className="mb-6 flex flex-wrap gap-2">
          {summary.map((v) => {
            const bad = v.value === "Да";
            return (
              <span
                key={v.label}
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[13px] font-bold ring-1 ${
                  bad ? "bg-[#fff4e5] text-[#9a5b00] ring-[#f5d9ac]" : "bg-[#e9f7ef] text-[#15803d] ring-[#c3ebd2]"
                }`}
              >
                {v.label}: {v.value}
              </span>
            );
          })}
        </div>
      ) : null}

      {/* Body — intact note or the non-original panels */}
      <div className="mb-6">
        <span className="mb-2 block text-[12px] font-semibold uppercase tracking-wide text-muted">Каросерия</span>
        {panels.length === 0 ? (
          <span className="inline-flex items-center gap-2 rounded-full bg-[#e9f7ef] px-3.5 py-1.5 text-[13px] font-bold text-[#15803d] ring-1 ring-[#c3ebd2]">
            <span className="size-2.5 rounded-full bg-[#22c55e]" /> Непокътната
          </span>
        ) : (
          <div className="flex flex-wrap gap-2">
            {panels.map((p) => (
              <span
                key={p.label}
                className="inline-flex items-center gap-1.5 rounded-full bg-[#fff4e5] px-3 py-1.5 text-[13px] font-semibold text-[#9a5b00] ring-1 ring-[#f5d9ac]"
              >
                {p.label}: <span className="font-bold">{p.status}</span>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Mechanics grid */}
      {mechanics.length > 0 ? (
        <div>
          <span className="mb-2 block text-[12px] font-semibold uppercase tracking-wide text-muted">Механика</span>
          <div className="grid grid-cols-1 gap-x-6 gap-y-1 sm:grid-cols-2 lg:grid-cols-3">
            {mechanics.map((m) => (
              <div key={m.label} className="flex items-center justify-between gap-3 border-b border-line/60 py-2 last:border-b-0">
                <span className="flex items-center gap-2 text-[13px] text-ink">
                  <span
                    className={`size-2.5 shrink-0 rounded-full ${m.tone === "warn" ? "bg-[#f59e0b]" : "bg-[#22c55e]"}`}
                  />
                  {m.label}
                </span>
                <span className={`shrink-0 text-[12px] font-bold ${m.tone === "warn" ? "text-[#b45309]" : "text-muted"}`}>
                  {m.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}
