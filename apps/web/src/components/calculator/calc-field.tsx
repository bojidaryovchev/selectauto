"use client";

import { useId, useState } from "react";
import { bgDecimal } from "@/data/import-rates";

/** Round to the step's precision, so 6,5 + 0,1 reads 6,6 and not 6,6000000001. */
function snap(n: number, step: number): number {
  const digits = step < 1 ? (String(step).split(".")[1]?.length ?? 0) : 0;
  return Number(n.toFixed(digits));
}

/**
 * A labelled numeric field for the financing calculators (boards `im-leasing`, `im-budget`; the kit's `.im-cf`): the
 * label above, a tall box with an optional „€" in front or „%" after, the hint under it. Module-scoped (one component
 * per file) so the `<input>` keeps focus/caret across parent re-renders — a render-time definition would remount it
 * every keystroke.
 *
 * `value` is a number owned by the parent; `onChange` receives a clamped number (never NaN). A decimal shows with a
 * comma („6,5", decision 11), and a comma or a dot may be typed. ↑ and ↓ step by `step`, as a number input does.
 *
 * A local text `draft` lets the field be CLEARED or left partial while editing instead of snapping to a number on
 * every keystroke — the plain `value={number}` control coerced an empty field to 0, which a `min`-clamp then bounced
 * up to `min`, making the input impossible to clear and retype. A parseable value is still pushed up live (clamped);
 * on blur the draft is dropped and the input settles on the clamped numeric value.
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
  const id = useId();
  const [draft, setDraft] = useState<string | null>(null);

  const push = (n: number) => {
    let v = n;
    if (v < min) v = min;
    if (max !== undefined && v > max) v = max;
    onChange(v);
  };

  return (
    <div className="im-cf">
      <label className="im-cf__l" htmlFor={id}>
        {label}
      </label>
      <div className="im-cf__box focus-within:border-or focus-within:shadow-[0_0_0_3px_var(--color-or-ring)]">
        {prefix ? <b aria-hidden="true">{prefix}</b> : null}
        <input
          id={id}
          type="text"
          inputMode="decimal"
          autoComplete="off"
          value={draft ?? (Number.isFinite(value) ? bgDecimal(value) : "")}
          onChange={(e) => {
            const raw = e.target.value;
            setDraft(raw);
            if (raw.trim() === "") return; // let the field sit empty mid-edit — don't push a number yet
            const n = Number(raw.replace(",", "."));
            if (!Number.isFinite(n)) return; // ignore un-parseable partials
            push(n);
          }}
          onKeyDown={(e) => {
            if (e.key !== "ArrowUp" && e.key !== "ArrowDown") return;
            e.preventDefault();
            const base = Number.isFinite(value) ? value : min;
            push(snap(base + (e.key === "ArrowUp" ? step : -step), step));
            setDraft(null);
          }}
          onBlur={() => setDraft(null)}
          aria-describedby={hint ? `${id}-hint` : undefined}
        />
        {suffix ? <b aria-hidden="true">{suffix}</b> : null}
      </div>
      {hint ? (
        <span id={`${id}-hint`} className="im-cf__h">
          {hint}
        </span>
      ) : null}
    </div>
  );
}
