import type { ReactNode } from "react";

/** A selectable answer button within a quiz step. */
export function QuizOption({
  onClick,
  children,
}: {
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full rounded-[14px] border border-[#d9dde4] bg-white px-3.5 py-[13px] text-left text-[15px] font-bold text-[#23252a] transition-all duration-200 hover:-translate-y-px hover:border-brand hover:bg-[#fff8f2] active:translate-y-0 max-[640px]:text-sm"
    >
      {children}
    </button>
  );
}
