/**
 * One label/value row in a calculator's summary panel — muted label left, bold
 * value right, hairline divider (last row has none). Presentational; no state, so
 * no `"use client"` needed (it's bundled into the client island that imports it).
 */
export function CalcResultRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-line/70 py-3 last:border-0">
      <span className="text-[15px] text-muted">{label}</span>
      <span className="text-[15px] font-black tabular-nums text-ink">{value}</span>
    </div>
  );
}
