import React from "react";

/**
 * Animated hamburger ↔ close glyph for the mobile drawer toggle. The three bars
 * slide out and a rotated cross fades in when `active`.
 *
 * This is presentational only — it renders a `<span>`, never a `<button>` — so it
 * can be dropped *inside* an interactive host (the bottom-nav's Меню `<Button>`)
 * without nesting buttons (invalid HTML). The host owns the tap, ripple and a11y;
 * this just draws the morphing bars. Rendered on the dark mobile shell, so the
 * bars are white. `boxed` wraps the glyph in the rounded translucent tile used
 * when it stands more on its own.
 */
interface Props {
  active: boolean;
  boxed?: boolean;
  className?: string;
}

export function NavHamburger({ active, boxed = false, className }: Props) {
  return (
    <span
      className={`flex size-6 items-center justify-center ${
        boxed ? `rounded-md ${active ? "bg-white/[0.14]" : "bg-white/8"}` : ""
      } ${className ?? ""}`}
    >
      <span className="relative flex h-3.5 w-5 origin-center flex-col justify-between overflow-hidden">
        <span
          className={`h-0.5 w-5 origin-left rounded-sm bg-white transition-all duration-300 ${
            active ? "translate-x-10" : ""
          }`}
        />
        <span
          className={`h-0.5 w-5 rounded-sm bg-white transition-all delay-75 duration-300 ${
            active ? "translate-x-10" : ""
          }`}
        />
        <span
          className={`h-0.5 w-5 origin-left rounded-sm bg-white transition-all delay-150 duration-300 ${
            active ? "translate-x-10" : ""
          }`}
        />

        <span
          className={`absolute inset-0 flex items-center justify-center transition-all duration-500 ${
            active ? "translate-x-0" : "-translate-x-10"
          }`}
        >
          <span
            className={`absolute h-0.5 w-4.5 rounded-sm bg-white transition-all delay-300 duration-500 ${
              active ? "rotate-45" : "rotate-0"
            }`}
          />
          <span
            className={`absolute h-0.5 w-4.5 rounded-sm bg-white transition-all delay-300 duration-500 ${
              active ? "-rotate-45" : "rotate-0"
            }`}
          />
        </span>
      </span>
    </span>
  );
}
