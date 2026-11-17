"use client";

import React from "react";

type IconButtonVariant = "default" | "ghost" | "over" | "vb";
type IconButtonSize = "sm" | "md" | "lg";

interface Props extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "aria-label"> {
  /** What the button does, read by screen readers: the button shows only an icon. */
  label: string;
  /**
   * `default`: a surface with a control border; `ghost`: no surface until hovered; `over`: on a photo;
   * `vb`: the Viber glyph colour.
   */
  variant?: IconButtonVariant;
  /** 36 · 44 (default, the touch minimum) · 48 px. */
  size?: IconButtonSize;
  /** A toggle that is on (a saved favourite): orange and filled, with `aria-pressed`. */
  pressed?: boolean;
  /** The icon. */
  children: React.ReactNode;
}

/**
 * A button that shows only an icon (Components board, „Бутон с икона"). Its `label` becomes the `aria-label`, so
 * every icon button has a name for screen readers.
 */
const IconButton = React.forwardRef<HTMLButtonElement, Props>(
  ({ label, variant = "default", size = "md", pressed, className = "", children, type, ...props }, ref) => {
    const classes = [
      "sa-ib",
      variant === "default" ? null : `sa-ib--${variant}`,
      size === "md" ? null : `sa-ib--${size}`,
      pressed ? "is-on" : null,
      className,
    ]
      .filter(Boolean)
      .join(" ");
    return (
      <button
        ref={ref}
        type={type ?? "button"}
        aria-label={label}
        aria-pressed={pressed === undefined ? undefined : pressed}
        className={classes}
        {...props}
      >
        {children}
      </button>
    );
  },
);

IconButton.displayName = "IconButton";

export { IconButton };
