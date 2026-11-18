import { MakePlate } from "@/components/common";
import { ChevronRightIcon } from "@/components/icons";

/**
 * An answer in the inquiry quiz (boards `ac-inq-desk`, `ac-inq-quiz`): a 56 px row. `row` answers end with a chevron;
 * a `make` starts with its logo plate (decorative, the name follows); a `model` is just its name, centred by its grid.
 */
export function QuizOption({
  onClick,
  children,
  kind = "row",
  logo,
}: {
  onClick: () => void;
  children: string;
  kind?: "row" | "make" | "model";
  /** The make's logo (`kind="make"`). */
  logo?: string | null;
}) {
  return (
    <button type="button" className="ac-qopt" onClick={onClick}>
      {kind === "make" ? <MakePlate name={children} logo={logo ?? null} size="sm" alt="" /> : null}
      <span>{children}</span>
      {kind === "row" ? <ChevronRightIcon /> : null}
    </button>
  );
}
