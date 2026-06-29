"use client";

import Link, { type LinkProps } from "next/link";
import React from "react";
import { Ripple } from "./ripple";

type AnchorProps = Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, keyof LinkProps | "href">;

interface Props extends LinkProps, AnchorProps {
  /** Ripple tint: "dark" for light surfaces, "light" for dark/coloured ones (default). */
  rippleTheme?: "dark" | "light";
  className?: string;
  children?: React.ReactNode;
}

/**
 * A `next/link` styled as a button (pill CTAs, card links, etc.). Bundles the
 * same affordances as `Button` — `cursor-pointer`, the `relative overflow-hidden`
 * host for the click <Ripple>, and ripple keyboard/pointer wiring — so links that
 * *look* like buttons also *feel* like them.
 *
 * It is a client component (the ripple uses hooks), but it wraps `next/link`, so
 * server components (footer, hero, CTAs) can drop it in without themselves
 * becoming client components. Defaults `rippleTheme` to "light" since most
 * button-styled links here sit on dark/brand surfaces; override per call site.
 */
const LinkButton = React.forwardRef<HTMLAnchorElement, Props>(
  ({ className = "", rippleTheme = "light", children, ...props }, ref) => {
    return (
      <Link
        ref={ref}
        className={`relative cursor-pointer overflow-hidden ${className}`}
        {...props}
      >
        {children}
        <Ripple theme={rippleTheme} />
      </Link>
    );
  },
);

LinkButton.displayName = "LinkButton";

export { LinkButton };
