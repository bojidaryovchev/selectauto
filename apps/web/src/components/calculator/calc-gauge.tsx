import type { ReactNode } from "react";

/** The ring's geometry, as drawn (`.im-gauge`, 208 px). */
const SIZE = 208;
const STROKE = 16;
const R = (SIZE - STROKE) / 2;
const C = 2 * Math.PI * R;

/**
 * The circular „donut" gauge of the financing calculators (boards `im-leasing`, `im-budget`; `.im-gauge`): a track
 * ring with a light arc filled to `fraction` (0–1, clamped; white, not orange, which is kept for actions) and the
 * centre's text — a caption, the big figure, a caption. Pure SVG, no `"use client"`.
 *
 * The arc starts at 12 o'clock and grows clockwise; above 1 it is a full ring, and at 0 there is no arc at all (a
 * round cap would otherwise leave a dot).
 */
export function CalcGauge({ fraction, children }: { fraction: number; children: ReactNode }) {
  const f = Math.min(Math.max(Number.isFinite(fraction) ? fraction : 0, 0), 1);

  return (
    <div className="im-gauge">
      <svg viewBox={`0 0 ${SIZE} ${SIZE}`} aria-hidden="true">
        <circle className="im-gauge__tr" cx={SIZE / 2} cy={SIZE / 2} r={R} fill="none" strokeWidth={STROKE} />
        {f > 0 ? (
          <circle
            className="im-gauge__arc transition-[stroke-dashoffset] duration-300 ease-out motion-reduce:transition-none"
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={R}
            fill="none"
            strokeWidth={STROKE}
            strokeLinecap="round"
            strokeDasharray={C}
            strokeDashoffset={C * (1 - f)}
          />
        ) : null}
      </svg>
      <div className="im-gauge__c">{children}</div>
    </div>
  );
}
