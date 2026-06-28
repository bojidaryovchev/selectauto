import type { ReactNode } from "react";

/** A single quiz step: a left-aligned title above a stack of option buttons. */
export function QuizStep({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="animate-[saFadeIn_0.28s_ease]">
      <h3 className="mb-2.5 text-left text-[17px] font-extrabold leading-[1.35] text-[#17181b]">
        {title}
      </h3>
      <div className="grid gap-2.5">{children}</div>
    </div>
  );
}
