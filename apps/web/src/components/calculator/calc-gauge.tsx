import type { ReactNode } from "react";

/**
 * The circular „donut" gauge from the live „Инструменти" panels — a track ring
 * with a brand-orange arc filled to `fraction` (0–1, clamped), and free-form
 * center content (a big number + caption). Pure SVG, no deps. Presentational, so
 * no `"use client"`.
 *
 * The arc starts at 12 o'clock (rotated −90°) and grows clockwise. `fraction`
 * above 1 is clamped to a full ring so an over-budget input still renders cleanly.
 *
 * Center content is confined to a box inside the ring (`maxWidth = size − 3·stroke`)
 * and wraps with tight leading + `overflow-wrap:anywhere`, so long labels and wide
 * values (e.g. a five-figure monthly payment) never collide with or spill past the
 * ring — the content always fits, at any input.
 */
export function CalcGauge({
  fraction,
  children,
  size = 208,
}: {
  fraction: number;
  children: ReactNode;
  size?: number;
}) {
  const stroke = 16;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const f = Math.min(Math.max(Number.isFinite(fraction) ? fraction : 0, 0), 1);
  const offset = c * (1 - f);
  // Confine the center content well within the ring's inner diameter (size − 2·stroke)
  // so wrapped label lines, which sit above/below centre where the circle is narrower,
  // still clear the stroke.
  const contentMax = size - stroke * 3;

  return (
    <div className="relative grid place-items-center" style={{ width: size, height: size }}>
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="-rotate-90"
        aria-hidden="true"
      >
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--color-line)" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="var(--color-brand)"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 350ms ease" }}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center">
        <div
          className="grid place-items-center gap-0.5 text-center leading-tight wrap-anywhere"
          style={{ maxWidth: contentMax }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
