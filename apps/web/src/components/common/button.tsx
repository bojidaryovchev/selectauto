"use client";

import React from "react";
import { Ripple } from "./ripple";

interface Props extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** Ripple tint: "dark" for light surfaces (default), "light" for dark/coloured ones. */
  rippleTheme?: "dark" | "light";
}

/**
 * The site's base `<button>`. Adds three things on top of a native button:
 * `cursor-pointer` (Tailwind's preflight resets buttons to the default arrow),
 * the `relative overflow-hidden` host needed by the click <Ripple>, and a
 * `disabled:cursor-not-allowed` affordance. Pass styling via `className` exactly
 * as before — it's appended after the base classes so it still wins specificity
 * ties and can override the cursor when needed.
 *
 * Forwards its ref (e.g. Swiper wires nav arrows by ref) and spreads the rest of
 * the native button props, so it's a drop-in for `<button>` across the app.
 */
const Button = React.forwardRef<HTMLButtonElement, Props>(
  ({ className = "", rippleTheme = "dark", children, type, ...props }, ref) => {
    return (
      <button
        ref={ref}
        type={type ?? "button"}
        className={`relative cursor-pointer overflow-hidden disabled:cursor-not-allowed ${className}`}
        {...props}
      >
        {children}
        <Ripple theme={rippleTheme} />
      </button>
    );
  },
);

Button.displayName = "Button";

export { Button };
