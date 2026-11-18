/** The kit's tag colours a status can take; `line` is the outlined draft, null the neutral one. */
export type AdminTone = "warn" | "info" | "pos" | "neg" | "line" | null;

/**
 * A status as the kit's tag with its dot (boards `ab-contracts`, `ab-contract-stages`, `ab-deposits`): the colour
 * always comes with its word, never alone. `prefix` names what the status is of, as the stage chips do („Кола:").
 */
export function AdminStatusTag({
  tone,
  prefix,
  children,
}: {
  tone: AdminTone;
  prefix?: string;
  children: React.ReactNode;
}) {
  const dot = tone && tone !== "line" ? `sa-dot sa-dot--${tone}` : "sa-dot";
  return (
    <span className={tone ? `sa-tag ab-st shrink-0 sa-tag--${tone}` : "sa-tag ab-st shrink-0"}>
      <span className={dot} aria-hidden="true" />
      {prefix ? <em>{prefix}:</em> : null}
      {children}
    </span>
  );
}
