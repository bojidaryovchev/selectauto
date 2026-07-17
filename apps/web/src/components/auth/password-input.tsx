"use client";

import React, { useState } from "react";
import { Button } from "@/components/common";
import { EyeIcon, EyeOffIcon } from "@/components/icons";
import { AUTH_INPUT_CLASS } from "./auth-styles";

/**
 * Auth password field with a show/hide toggle. Renders a shared `AUTH_INPUT_CLASS`
 * input plus a proper (ripple-backed) icon button pinned to the right that flips
 * the input between `password` and `text`. Forwards its ref and spreads the rest
 * of the native input props, so it's a drop-in for the auth `<input>` and works
 * directly with react-hook-form's `{...register("…")}`.
 *
 * The right padding is set inline (not via a Tailwind class) so it always wins
 * over `AUTH_INPUT_CLASS`'s `px-4` regardless of stylesheet source order — text
 * never slides under the toggle.
 */
export const PasswordInput = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className = "", style, ...props }, ref) => {
    const [visible, setVisible] = useState(false);

    return (
      <div className="relative">
        <input
          ref={ref}
          type={visible ? "text" : "password"}
          className={`${AUTH_INPUT_CLASS} ${className}`}
          style={{ paddingRight: "3.5rem", ...style }}
          {...props}
        />
        <Button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? "Скрий паролата" : "Покажи паролата"}
          aria-pressed={visible}
          title={visible ? "Скрий паролата" : "Покажи паролата"}
          className="absolute right-1.5 top-1/2 flex size-11 -translate-y-1/2 items-center justify-center rounded-[10px] text-[#6b7280] transition-colors hover:text-brand-dark focus-visible:outline-none focus-visible:text-brand-dark"
        >
          {visible ? <EyeOffIcon className="size-5" /> : <EyeIcon className="size-5" />}
        </Button>
      </div>
    );
  },
);

PasswordInput.displayName = "PasswordInput";
