"use client";

import React from "react";
import { buttonClasses, type ButtonStyleProps } from "./button-variants";
import { Ripple } from "./ripple";

interface Props extends React.ButtonHTMLAttributes<HTMLButtonElement>, ButtonStyleProps {
  /** Ripple tint for the legacy look: "dark" for light surfaces (default), "light" for dark/coloured ones. */
  rippleTheme?: "dark" | "light";
  /** Work in progress: shows the kit's spinner before the label and sets `aria-busy`. Pass a label in -ане. */
  busy?: boolean;
}

/**
 * The site's base `<button>`.
 *
 * - With a `variant`, it is a „Нощно шосе" button (see `button-variants.ts`): the kit's classes, its hover, pressed
 *   and focus states, and a spinner while `busy`. `className` adds layout utilities on top.
 * - Without one, it keeps the legacy look the old pages still use until they are rebuilt: no styling of its own
 *   beyond `cursor-pointer`, the `relative overflow-hidden` host and the click <Ripple>, with the caller's
 *   `className` doing the rest.
 *
 * Forwards its ref (e.g. Swiper wires nav arrows by ref) and spreads the rest of the native button props, so it's a
 * drop-in for `<button>` across the app.
 */
const Button = React.forwardRef<HTMLButtonElement, Props>(
  ({ className = "", rippleTheme = "dark", variant, size, block, busy = false, children, type, ...props }, ref) => {
    if (variant) {
      return (
        <button
          ref={ref}
          type={type ?? "button"}
          aria-busy={busy || undefined}
          className={`${buttonClasses({ variant, size, block })} ${className}`}
          {...props}
        >
          {busy ? <span className="sa-spin" aria-hidden="true" /> : null}
          {children}
        </button>
      );
    }
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
