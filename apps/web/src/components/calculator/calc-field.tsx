"use client";

/**
 * A labeled numeric input for the financing calculators — a large, rounded box
 * with an optional „€" prefix or „%" suffix, matching the live selectauto.bg
 * „Инструменти" fields. Module-scoped (one component per file) so the `<input>`
 * keeps focus/caret across parent re-renders — a render-time definition would
 * remount it every keystroke.
 *
 * `value` is a number owned by the parent; `onChange` receives a clamped number
 * (never NaN). `hint` is the small helper line under the field.
 */
export function CalcField({
  label,
  hint,
  value,
  onChange,
  prefix,
  suffix,
  min = 0,
  max,
  step = 1,
}: {
  label: string;
  hint?: string;
  value: number;
  onChange: (v: number) => void;
  prefix?: string;
  suffix?: string;
  min?: number;
  max?: number;
  step?: number;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[15px] font-extrabold text-ink">{label}</span>
      <div className="flex items-center gap-2 rounded-2xl border border-line bg-white px-4 py-3 transition-colors duration-200 focus-within:border-brand">
        {prefix ? <span className="text-xl font-black text-brand">{prefix}</span> : null}
        <input
          type="number"
          inputMode="decimal"
          min={min}
          max={max}
          step={step}
          value={Number.isFinite(value) ? value : ""}
          onChange={(e) => {
            let n = Number(e.target.value);
            if (!Number.isFinite(n)) n = min;
            if (n < min) n = min;
            if (max !== undefined && n > max) n = max;
            onChange(n);
          }}
          className="w-full min-w-0 bg-transparent text-2xl font-black tabular-nums text-ink outline-none max-md:text-xl"
        />
        {suffix ? <span className="text-lg font-black text-brand">{suffix}</span> : null}
      </div>
      {hint ? <span className="text-[13px] text-muted">{hint}</span> : null}
    </label>
  );
}
