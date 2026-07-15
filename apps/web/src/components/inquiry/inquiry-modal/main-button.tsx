import type { ReactNode } from "react";
import { Button } from "@/components/common";

/** Primary full-width action button (start screen + final submit). */
export function MainButton({
  onClick,
  disabled,
  type,
  children,
}: {
  onClick?: () => void;
  disabled?: boolean;
  /** "submit" lets the final name/phone step submit its react-hook-form on Enter. */
  type?: "button" | "submit";
  children: ReactNode;
}) {
  return (
    <Button
      onClick={onClick}
      disabled={disabled}
      type={type}
      rippleTheme="light"
      className="inline-flex min-h-14.5 w-full items-center justify-center rounded-[14px] bg-[linear-gradient(90deg,#b95200,#d86f16)] text-[15px] font-extrabold text-white shadow-[0_12px_26px_rgba(216,111,22,0.24)] transition-transform duration-200 hover:-translate-y-px disabled:opacity-80 max-[640px]:text-sm"
    >
      {children}
    </Button>
  );
}
