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
  /** The band's colour: its legend dot and its stop in the meter (the board's data colours for the dark ground). */
  dot: string;
};

// Worst → best (board `cd-iaai`).
const BANDS: Band[] = [
  { min: 0, max: 9, label: "Не подлежи на ремонт", dot: "#FF6B5E" },
  { min: 10, max: 19, label: "Тежки щети", dot: "#FF8A4C" },
  { min: 20, max: 29, label: "Големи щети", dot: "#F5B83D" },
  { min: 30, max: 39, label: "Умерени щети", dot: "#E6D04A" },
  { min: 40, max: 49, label: "Леки щети", dot: "#A6D85A" },
  { min: 50, max: 50, label: "Минимални щети", dot: "#3DD68C" },
];

/** A band's colour dot (legend and headline). */
function Dot({ color }: { color: string }) {
  return <span className="cd-ldot" style={{ background: color }} aria-hidden="true" />;
}

/**
 * The IAA Vehicle Score card (IAAI only; boards `cd-iaai`, `cd-buynow-iaai`): the value out of 50, its band, a meter
 * with the score's mark, the six-band legend with „← тази оценка" on the car's band, and the footnote.
 */
export function CarIaaScore({ value }: { value: number }) {
  // Clamp defensively; the mapper already validates the 0–50 range.
  const v = Math.max(0, Math.min(50, Math.round(value)));
  const activeIndex = Math.max(
    0,
    BANDS.findIndex((b) => v >= b.min && v <= b.max),
  );
  const active = BANDS[activeIndex];

  return (
    <section className="sa-pnl cd-iaa" aria-label={`IAA Vehicle Score: ${v} от 50 — ${active.label.toLowerCase()}`}>
      <div className="sa-pnl__h">
        <h2 className="sa-pnl__t">IAAI оценка</h2>
        <span className="sa-label">IAA Vehicle Score</span>
      </div>

      <div className="cd-iaa__top">
        <span className="cd-iaa__v">
          {v}
          <small> / 50</small>
        </span>
        <span className="cd-band">
          <Dot color={active.dot} />
          {active.label}
        </span>
      </div>

      <div className="sa-meter" aria-hidden="true">
        <b style={{ left: `${(v / 50) * 100}%` }} />
      </div>
      <div className="cd-scale">
        <span>0 — тотална щета</span>
        <span>50 — минимална</span>
      </div>

      <ul className="sa-legend">
        {BANDS.map((b, i) => (
          // On a phone the longest band („Не подлежи на ремонт") with its marker takes two lines: the label wraps, the
          // marker stays whole, and the padding keeps the wrapped row off its edges (one-line rows keep their 34 px).
          <li key={b.min} className={`py-1.5 ${i === activeIndex ? "is-on" : ""}`}>
            <Dot color={b.dot} />
            <b>{b.min === b.max ? b.min : `${b.min}–${b.max}`}</b>
            {b.label}
            {i === activeIndex ? <em className="whitespace-nowrap">← тази оценка</em> : null}
          </li>
        ))}
      </ul>

      <p className="sa-small cd-iaa__n">
        AI оценка на щетите по външните снимки на автомобила (IAA Vehicle Score). По-висок резултат означава по-малко
        щети.
      </p>
    </section>
  );
}
