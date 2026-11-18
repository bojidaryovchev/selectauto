import type { ReactNode } from "react";

/**
 * A section's heading in the „Нощно шосе" kit (`.sa-sh`; boards `hm-home` and most page sections): the orange
 * eyebrow, the title and an optional lead on the left, optional actions on the right, which drop under the text when
 * there's no room.
 *
 * - `titleId` names the section (`aria-labelledby`).
 * - `titleClassName` sets the title's type: `type-h2` by default, `type-h1` for a band's single big title.
 * - `eyebrowEnd` sits at the eyebrow row's far end (the car rails' arrows on a phone).
 * - `actionsClassName` adds to the actions' box, e.g. `sa-hide-ph` when a phone shows them elsewhere.
 */
export function SectionHeading({
  eyebrow,
  eyebrowEnd,
  title,
  titleId,
  titleClassName = "type-h2",
  lead,
  actions,
  actionsClassName = "",
  className = "",
}: {
  eyebrow?: string;
  eyebrowEnd?: ReactNode;
  title: ReactNode;
  titleId?: string;
  titleClassName?: string;
  lead?: ReactNode;
  actions?: ReactNode;
  actionsClassName?: string;
  className?: string;
}) {
  const eyebrowEl = eyebrow ? <span className="sa-eyebrow">{eyebrow}</span> : null;
  return (
    <div className={`sa-sh ${className}`}>
      <div className="sa-sh__l">
        {eyebrowEnd ? (
          <div className="flex items-center justify-between gap-3">
            {eyebrowEl}
            {eyebrowEnd}
          </div>
        ) : (
          eyebrowEl
        )}
        <h2 id={titleId} className={titleClassName}>
          {title}
        </h2>
        {lead ? <p className="sa-lead">{lead}</p> : null}
      </div>
      {actions ? <div className={`sa-sh__r ${actionsClassName}`}>{actions}</div> : null}
    </div>
  );
}
