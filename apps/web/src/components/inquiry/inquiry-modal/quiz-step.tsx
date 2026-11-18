import type { ReactNode } from "react";

const LIST = { rows: "ac-qopts", makes: "ac-qbrands", models: "ac-qmodels" } as const;

/**
 * One quiz step (boards `ac-inq-desk`, `ac-inq-quiz`): the question in the display face above its answers — rows, the
 * makes' grid or the models' grid. The question takes the focus when the step appears (see inquiry-modal.tsx), so a
 * keyboard or screen-reader user lands on it once the answer they pressed is gone.
 */
export function QuizStep({
  title,
  list = "rows",
  children,
}: {
  title: string;
  list?: keyof typeof LIST;
  children: ReactNode;
}) {
  return (
    <div className="flex animate-[saFadeIn_0.28s_ease] flex-col gap-4.5 motion-reduce:animate-none">
      <h2 className="ac-iq__q outline-none" tabIndex={-1} data-iq-focus>
        {title}
      </h2>
      <div className={LIST[list]}>{children}</div>
    </div>
  );
}
