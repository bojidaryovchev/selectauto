import type { CarHistoryEntry } from "@/types/car-detail.type";

/** Recall flags carry their state's tone, always beside the word (board `cd-korea-full`); the rest are neutral. */
const FLAG_TONE: Record<string, string> = {
  "Отзоваване (изпълнено)": "sa-tag--pos",
  "Отзоваване (необходимо)": "sa-tag--warn",
};

/**
 * ENCAR vehicle-history timeline (`details.history[]`) — „История на автомобила" with the count (boards `cd-korea*`):
 * a dated list of ownership, insurance and recall events in two columns from 640 px, each with its flag (Дилър, Частно
 * лице, Отзоваване …) on the date line and an optional detail. Server-rendered; renders nothing when the car has no
 * history (present on ~78% of active ENCAR lots, never on archived ones).
 */
export function CarHistoryTimeline({ history, id }: { history: CarHistoryEntry[]; id?: string }) {
  if (history.length === 0) return null;

  return (
    <section id={id} className="sa-pnl scroll-mt-[calc(var(--header-h)+16px)]">
      <div className="sa-pnl__h">
        <h2 className="sa-pnl__t">
          История на автомобила <small className="text-sm font-bold text-tx3">({history.length})</small>
        </h2>
      </div>
      <ol className="sa-tl cd-tl2">
        {history.map((entry, i) => (
          <li key={i}>
            {entry.date || entry.flag ? (
              <div className="cd-tlh">
                {entry.date ? <time>{entry.date}</time> : null}
                {entry.flag ? <span className={`sa-tag ${FLAG_TONE[entry.flag] ?? ""}`}>{entry.flag}</span> : null}
              </div>
            ) : null}
            {entry.title ? <b>{entry.title}</b> : null}
            {entry.sub && entry.sub !== entry.title ? <p>{entry.sub}</p> : null}
          </li>
        ))}
      </ol>
    </section>
  );
}
