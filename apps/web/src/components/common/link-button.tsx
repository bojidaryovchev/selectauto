"use client";

import Link, { type LinkProps } from "next/link";
import React from "react";
import { useHasPainted } from "@/lib/after-first-paint";
import { buttonClasses, type ButtonStyleProps } from "./button-variants";
import { Ripple } from "./ripple";

type AnchorProps = Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, keyof LinkProps | "href">;

interface Props extends LinkProps, AnchorProps, ButtonStyleProps {
  /** Ripple tint for the legacy look: "dark" for light surfaces, "light" for dark/coloured ones (default). */
  rippleTheme?: "dark" | "light";
  className?: string;
  children?: React.ReactNode;
}

/**
 * A `next/link` that looks like a button.
 *
 * - With a `variant`, it is a „Нощно шосе" button (see `button-variants.ts`), with the kit's classes and states.
 * - Without one, it keeps the legacy look the old pages still use until they are rebuilt: `cursor-pointer`, the
 *   `relative overflow-hidden` host and the click <Ripple>, styled by the caller's `className`.
 *
 * It is a client component (the ripple and the paint gate use hooks), but it wraps `next/link`, so server components
 * (footer, hero, CTAs) can drop it in without themselves becoming client components. There is no route prefetch until
 * the page has painted (see `useHasPainted`).
 */
const LinkButton = React.forwardRef<HTMLAnchorElement, Props>(
  ({ className = "", rippleTheme = "light", variant, size, block, children, prefetch, ...props }, ref) => {
    const painted = useHasPainted();
    if (variant) {
      return (
        <Link
          ref={ref}
          prefetch={painted ? prefetch : false}
          className={`${buttonClasses({ variant, size, block })} ${className}`}
          {...props}
        >
          {children}
        </Link>
      );
    }
    return (
      <Link
        ref={ref}
        prefetch={painted ? prefetch : false}
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
