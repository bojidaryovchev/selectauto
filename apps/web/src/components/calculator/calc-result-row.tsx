/**
 * One label/value row in a calculator's summary (the kit's `.im-row`): the label left, the value right and on one
 * line, a hairline between rows. Presentational; no state, so no `"use client"`.
 */
export function CalcResultRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="im-row">
      <span>{label}</span>
      <b>{value}</b>
    </div>
  );
}
