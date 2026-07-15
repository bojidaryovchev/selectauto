"use client";

import { eur } from "@/lib/finance";

/**
 * A range slider with min/max end labels, paired with a `CalcField` in the
 * calculators (the field shows the exact value, the slider gives quick coarse
 * control — same UX as the live „Инструменти" page). The orange fill/thumb is
 * styled in `globals.css` via the `.calc-range` class (accent-color + thumb),
 * kept out of Tailwind because pseudo-element thumb styling isn't expressible in
 * utilities.
 *
 * `format` renders the end labels; defaults to the `eur` money formatter. Use
 * `formatMaxLabel` (e.g. „5000+", „Макс") when the top of the range is a cap.
 */
export function CalcSlider({
  value,
  onChange,
  min,
  max,
  step = 1,
  ariaLabel,
  format = eur,
  minLabel,
  maxLabel,
}: {
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  step?: number;
  ariaLabel: string;
  format?: (n: number) => string;
  minLabel?: string;
  maxLabel?: string;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <input
        type="range"
        aria-label={ariaLabel}
        min={min}
        max={max}
        step={step}
        value={Math.min(Math.max(value, min), max)}
        onChange={(e) => onChange(Number(e.target.value))}
        className="calc-range w-full"
      />
      <div className="flex items-center justify-between text-[13px] font-semibold text-muted">
        <span>{minLabel ?? format(min)}</span>
        <span>{maxLabel ?? format(max)}</span>
      </div>
    </div>
  );
}
