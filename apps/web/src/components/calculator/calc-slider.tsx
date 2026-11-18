"use client";

import type { CSSProperties } from "react";
import { eur } from "@/lib/finance";

/**
 * A range slider with its end labels, paired with a `CalcField` in the calculators (the field shows the exact value,
 * the slider gives quick coarse control). The kit's slider (`sa-range`): an orange fill on a dark track and a light
 * thumb — a native `<input type="range">` styled in globals.css (`.calc-range`), the fill drawn from `--pct`.
 *
 * `format` renders the end labels; defaults to the `eur` money formatter. Use `minLabel` / `maxLabel` (e.g. „€0",
 * „Макс", „€5000+") when an end reads differently.
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
  const clamped = Math.min(Math.max(value, min), max);
  const pct = max > min ? ((clamped - min) / (max - min)) * 100 : 0;

  return (
    <div className="sa-range im-range">
      <input
        type="range"
        aria-label={ariaLabel}
        min={min}
        max={max}
        step={step}
        value={clamped}
        onChange={(e) => onChange(Number(e.target.value))}
        // 24 px tall for the thumb, laid out as the 6 px track (the kit's spacing to the end labels).
        className="calc-range -my-2.25 w-full"
        style={{ "--pct": `${pct}%` } as CSSProperties}
      />
      <div className="sa-range__ends">
        <span>{minLabel ?? format(min)}</span>
        <span>{maxLabel ?? format(max)}</span>
      </div>
    </div>
  );
}
