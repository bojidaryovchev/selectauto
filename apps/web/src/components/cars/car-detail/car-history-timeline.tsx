import type { CarHistoryEntry } from "@/types/car-detail.type";

/**
 * ENCAR vehicle-history timeline (`details.history[]`) — the "История на автомобила"
 * section: a dated vertical list of ownership/insurance/recall events, each with a
 * coloured flag pill (Дилър / Частно лице / Отзоваване …) and an optional detail
 * line. Server-rendered; renders nothing when the car has no history (common — the
 * data is present on ~78% of active ENCAR lots and never on archived ones).
 */
export function CarHistoryTimeline({ history }: { history: CarHistoryEntry[] }) {
  if (history.length === 0) return null;

  return (
    <section className="rounded-2xl border border-line bg-white p-6 shadow-card max-md:p-5">
      <h2 className="mb-5 text-lg font-black uppercase tracking-tight text-ink">
        История на автомобила
        <span className="ml-2 text-sm font-bold text-muted">({history.length})</span>
      </h2>
      <ol className="relative ml-1.5 border-l-2 border-line">
        {history.map((entry, i) => (
          <li key={i} className="relative pb-6 pl-6 last:pb-0">
            <span className="absolute -left-1.75 top-1 size-3 rounded-full border-2 border-brand bg-white" />
            {entry.date ? (
              <span className="block text-[13px] font-bold uppercase tracking-wide text-brand-dark">
                {entry.date}
              </span>
            ) : null}
            {entry.title ? (
              <span className="mt-0.5 block text-sm font-bold text-ink">{entry.title}</span>
            ) : null}
            {entry.flag ? (
              <span className="mt-1.5 inline-flex items-center rounded-full bg-[#fbebe3] px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide text-[#b4531f]">
                {entry.flag}
              </span>
            ) : null}
            {entry.sub && entry.sub !== entry.title ? (
              <span className="mt-1.5 block whitespace-pre-line text-[13px]/relaxed text-muted">
                {entry.sub}
              </span>
            ) : null}
          </li>
        ))}
      </ol>
    </section>
  );
}
