import type { ReactNode } from "react";

/** Primary full-width action button (start screen + final submit). */
export function MainButton({
  onClick,
  disabled,
  children,
}: {
  onClick: () => void;
  disabled?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="inline-flex min-h-[58px] w-full items-center justify-center rounded-[14px] bg-[linear-gradient(90deg,#b95200,#d86f16)] text-[15px] font-extrabold text-white shadow-[0_12px_26px_rgba(216,111,22,0.24)] transition-transform duration-200 hover:-translate-y-px disabled:cursor-not-allowed disabled:opacity-80 max-[640px]:text-sm"
    >
      {children}
    </button>
  );
}
