/**
 * One label/value row in a calculator's summary panel — muted label left, bold
 * value right, hairline divider (last row has none). Presentational; no state, so
 * no `"use client"` needed (it's bundled into the client island that imports it).
 */
export function CalcResultRow({ label, value }: { label: string; value: string }) {
  return (
    // items-start + a pinned value: a wide 5-digit sum (e.g. „150 000 €") never
    // wraps its own spaces, and when the label wraps to two lines the value stays
    // on the first line instead of floating to the vertical middle.
    <div className="flex items-start justify-between gap-3 border-b border-line/70 py-3 last:border-0">
      <span className="min-w-0 text-[15px] text-muted">{label}</span>
      <span className="shrink-0 whitespace-nowrap text-[15px] font-black tabular-nums text-ink">{value}</span>
    </div>
  );
}
