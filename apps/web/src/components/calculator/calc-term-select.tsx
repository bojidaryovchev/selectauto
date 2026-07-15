"use client";

import { Button } from "@/components/common";

/** The lease terms both calculators offer, in months (mirrors the live site). */
export const TERM_OPTIONS = [12, 24, 36, 48, 60, 72] as const;

/**
 * The month-term picker — a responsive grid of pill buttons, active one filled
 * brand-orange. Shared by both calculators. Controlled: `value` is the selected
 * month count, `onChange` fires with the picked option.
 */
export function CalcTermSelect({
  value,
  onChange,
  options = TERM_OPTIONS,
}: {
  value: number;
  onChange: (months: number) => void;
  options?: readonly number[];
}) {
  return (
    <div className="grid grid-cols-3 gap-3">
      {options.map((m) => {
        const active = m === value;
        return (
          <Button
            key={m}
            aria-pressed={active}
            onClick={() => onChange(m)}
            rippleTheme={active ? "light" : "dark"}
            className={`rounded-2xl border px-3 py-3.5 text-lg font-black tabular-nums transition-colors ${
              active
                ? "border-brand bg-brand text-white shadow-[0_10px_24px_rgba(216,111,22,0.28)]"
                : "border-line bg-white text-ink hover:border-brand/50"
            }`}
          >
            {m}
          </Button>
        );
      })}
    </div>
  );
}
