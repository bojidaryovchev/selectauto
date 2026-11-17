"use client";

import type { ReactNode } from "react";

/**
 * Lays an individual frosted-glass panel over ONE catalog card while a filter
 * navigation is pending — the per-card "these results are updating" cue. A
 * single sheet stretched over the whole grid read as cheap; framing each card in
 * its own glass looks deliberate.
 *
 * The panel is `absolute inset-0` inside a `relative` wrapper, matching the
 * card's radius: the card dims and loses some colour in place, as the kit's
 * `.sa-car.is-pending` draws it (board `kit-cards`, „обновява се").
 *
 * LAYOUT-NEUTRAL by construction, which the virtualized grid REQUIRES (it keys
 * scroll math off uniform, deterministic row heights): the wrapper is `h-full`
 * with no padding/border/margin, so it measures exactly as the bare card did;
 * the panel is absolutely positioned (out of flow) and `pointer-events-none`, so
 * it adds no height and blocks no clicks. Renders nothing when not pending.
 */
export function CardGlass({ pending, children }: { pending: boolean; children: ReactNode }) {
  return (
    <div className="relative h-full">
      {children}
      {pending ? (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 z-10 rounded-lg bg-bg/38 backdrop-blur-[1.5px] backdrop-saturate-[0.7]"
        />
      ) : null}
    </div>
  );
}
