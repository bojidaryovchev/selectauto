/**
 * IAA Vehicle Score card (IAAI-only) — surfaces the "IAAI оценка" as a
 * colour-graded 0–50 damage meter plus the full six-band legend, instead of a
 * bare, ambiguous number in the spec sheet.
 *
 * The score is IAAI's AI damage rating (four-corner image analysis) on a NATIVE
 * 0–50 scale where HIGHER = LESS damage (50 = little damage, 0 = non-repairable).
 * It is NOT a 0.0–5.0 grade: a value of 37 means "37 / 50" (moderate damage),
 * never "3.7". Copart/Encar lots don't carry it, so the page renders this only
 * when a score is present.
 *
 * Bands (IAA's published rubric):
 *   0–9 non-repairable · 10–19 severe · 20–29 major · 30–39 moderate ·
 *   40–49 minor · 50 little damage.
 */

type Band = {
  min: number;
  max: number;
  /** BG band label. */
  label: string;
  /** Legend dot / meter gradient stop colour. */
  dot: string;
  /** Highlight classes (bg + text + ring) for the active row / headline pill. */
  tone: string;
};

// Worst → best. `dot` doubles as this band's stop in the meter gradient. The
// last two tones match the green/amber palette used in car-inspection.tsx.
const BANDS: Band[] = [
  { min: 0, max: 9, label: "Не подлежи на ремонт", dot: "#dc2626", tone: "bg-[#fdecec] text-[#b91c1c] ring-[#f3c4c4]" },
  { min: 10, max: 19, label: "Тежки щети", dot: "#f97316", tone: "bg-[#fff1e8] text-[#c2410c] ring-[#f8cfa8]" },
  { min: 20, max: 29, label: "Големи щети", dot: "#f59e0b", tone: "bg-[#fff4e5] text-[#9a5b00] ring-[#f5d9ac]" },
  { min: 30, max: 39, label: "Умерени щети", dot: "#eab308", tone: "bg-[#fefce8] text-[#854d0e] ring-[#f0e08a]" },
  { min: 40, max: 49, label: "Леки щети", dot: "#84cc16", tone: "bg-[#f4fae8] text-[#4d7c0f] ring-[#d5e9a8]" },
  { min: 50, max: 50, label: "Минимални щети", dot: "#22c55e", tone: "bg-[#e9f7ef] text-[#15803d] ring-[#c3ebd2]" },
];

// Even red→green gradient across the six band colours (0 %, 20 %, … 100 %).
const METER_GRADIENT = `linear-gradient(to right, ${BANDS.map(
  (b, i) => `${b.dot} ${Math.round((i / (BANDS.length - 1)) * 100)}%`,
).join(", ")})`;

export function CarIaaScore({ value }: { value: number }) {
  // Clamp defensively; the mapper already validates the 0–50 range.
  const v = Math.max(0, Math.min(50, Math.round(value)));
  const activeIndex = Math.max(
    0,
    BANDS.findIndex((b) => v >= b.min && v <= b.max),
  );
  const active = BANDS[activeIndex];
  const pct = (v / 50) * 100;

  return (
    <section
      className="rounded-2xl border border-line bg-white p-6 shadow-card max-md:p-5"
      aria-label={`IAA Vehicle Score: ${v} от 50 — ${active.label.toLowerCase()}`}
    >
      <div className="mb-5 flex items-baseline justify-between gap-3">
        <h2 className="text-lg font-black uppercase tracking-tight text-ink">IAAI оценка</h2>
        <span className="shrink-0 text-[11px] font-semibold uppercase tracking-wide text-muted">IAA Vehicle Score</span>
      </div>

      {/* Headline value + current band pill */}
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <span className="text-3xl font-black leading-none text-ink">
          {v}
          <span className="text-lg font-bold text-muted"> / 50</span>
        </span>
        <span
          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[13px] font-bold ring-1 ${active.tone}`}
        >
          <span className="size-2.5 rounded-full" style={{ backgroundColor: active.dot }} />
          {active.label}
        </span>
      </div>

      {/* Meter — red→green track with a marker at the exact score */}
      <div className="mb-5">
        <div className="relative h-2.5 w-full rounded-full" style={{ background: METER_GRADIENT }}>
          <span
            className="absolute top-1/2 size-4 -translate-1/2 rounded-full border-2 border-white bg-ink shadow-md ring-1 ring-black/10"
            style={{ left: `${pct}%` }}
            aria-hidden
          />
        </div>
        <div className="mt-1.5 flex justify-between text-[11px] font-semibold text-muted">
          <span>0 — тотална щета</span>
          <span>50 — минимална</span>
        </div>
      </div>

      {/* Full band legend (the rubric), active band highlighted */}
      <ul className="space-y-0.5">
        {BANDS.map((b, i) => {
          const on = i === activeIndex;
          return (
            <li
              key={b.min}
              className={`flex items-center gap-3 rounded-lg px-2.5 py-1.5 text-[13px] ${
                on ? `font-bold ring-1 ${b.tone}` : "text-ink"
              }`}
            >
              <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: b.dot }} />
              <span className={`w-12 shrink-0 font-semibold tabular-nums ${on ? "" : "text-muted"}`}>
                {b.min === b.max ? b.min : `${b.min}–${b.max}`}
              </span>
              <span className="flex-1">{b.label}</span>
              {on ? <span className="shrink-0 text-[11px] font-bold uppercase tracking-wide">← тази оценка</span> : null}
            </li>
          );
        })}
      </ul>

      <p className="mt-4 text-xs/relaxed text-muted">
        AI оценка на щетите по външните снимки на автомобила (IAA Vehicle Score). По-висок резултат означава
        по-малко щети.
      </p>
    </section>
  );
}
