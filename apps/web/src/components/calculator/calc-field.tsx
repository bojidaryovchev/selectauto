"use client";

import { useState } from "react";

/**
 * A labeled numeric input for the financing calculators — a large, rounded box
 * with an optional „€" prefix or „%" suffix, matching the live selectauto.bg
 * „Инструменти" fields. Module-scoped (one component per file) so the `<input>`
 * keeps focus/caret across parent re-renders — a render-time definition would
 * remount it every keystroke.
 *
 * `value` is a number owned by the parent; `onChange` receives a clamped number
 * (never NaN). `hint` is the small helper line under the field.
 *
 * A local text `draft` lets the field be CLEARED or left partial while editing
 * instead of snapping to a number on every keystroke — the plain `value={number}`
 * control coerced an empty field to 0, which a `min`-clamp then bounced up to
 * `min`, making the input impossible to clear and retype. A parseable value is
 * still pushed up live (clamped); on blur the draft is dropped and the input
 * settles on the clamped numeric value.
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
  const [draft, setDraft] = useState<string | null>(null);

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
          value={draft ?? (Number.isFinite(value) ? String(value) : "")}
          onChange={(e) => {
            const raw = e.target.value;
            setDraft(raw);
            if (raw === "") return; // let the field sit empty mid-edit — don't push a number yet
            let n = Number(raw);
            if (!Number.isFinite(n)) return; // ignore un-parseable partials (e.g. "1.")
            if (n < min) n = min;
            if (max !== undefined && n > max) n = max;
            onChange(n);
          }}
          onBlur={() => setDraft(null)}
          className="w-full min-w-0 bg-transparent text-2xl font-black tabular-nums text-ink outline-none max-md:text-xl"
        />
        {suffix ? <span className="text-lg font-black text-brand">{suffix}</span> : null}
      </div>
      {hint ? <span className="text-[13px] text-muted">{hint}</span> : null}
    </label>
  );
}
