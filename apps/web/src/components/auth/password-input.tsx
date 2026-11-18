"use client";

import React, { useState } from "react";
import { EyeIcon, EyeOffIcon } from "@/components/icons";

/**
 * A password field with the eye button at its end that shows and hides what was typed (boards `ac-signin`,
 * `ac-register`, `ac-reset`). Forwards its ref and spreads the native input props, so it works with react-hook-form's
 * `{...register("…")}`. The kit's input wrapper assumes a leading icon; this field has none, so its text starts at
 * the field's own padding.
 */
export const PasswordInput = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className = "", ...props }, ref) => {
    const [visible, setVisible] = useState(false);
    const label = visible ? "Скрийте паролата" : "Покажете паролата";

    return (
      <span className="sa-inw">
        <input
          ref={ref}
          type={visible ? "text" : "password"}
          className={`sa-in has-end pl-3.5 ${className}`}
          {...props}
        />
        <button
          type="button"
          className="sa-ib"
          onClick={() => setVisible((v) => !v)}
          aria-label={label}
          aria-pressed={visible}
          title={label}
        >
          {visible ? <EyeOffIcon /> : <EyeIcon />}
        </button>
      </span>
    );
  },
);

PasswordInput.displayName = "PasswordInput";
