"use client";

/** The lease terms both calculators offer, in months (mirrors the live site). */
export const TERM_OPTIONS = [12, 24, 36, 48, 60, 72] as const;

/**
 * The month-term picker (the kit's `.im-terms`): a three-column grid of buttons, the chosen one filled. Shared by
 * both calculators. Controlled: `value` is the selected month count, `onChange` fires with the picked option; `label`
 * names the group (the visible label above it).
 */
export function CalcTermSelect({
  label,
  value,
  onChange,
  options = TERM_OPTIONS,
}: {
  label: string;
  value: number;
  onChange: (months: number) => void;
  options?: readonly number[];
}) {
  return (
    <div className="im-terms" role="group" aria-label={label}>
      {options.map((m) => (
        <button key={m} type="button" aria-pressed={m === value} onClick={() => onChange(m)}>
          {m}
        </button>
      ))}
    </div>
  );
}
