"use client";

import { useId, useState, type ReactNode } from "react";
import { ChevronDownIcon } from "@/components/icons";

type ExpandableSectionProps = {
  /** Header label — rendered inside the heading's toggle button. */
  title: ReactNode;
  children: ReactNode;
  /** Start expanded. Defaults to collapsed. */
  defaultOpen?: boolean;
  /** Semantic heading level for the title (accessible accordion pattern). */
  headingLevel?: 2 | 3 | 4;
  /** Extra classes on the panel. */
  className?: string;
};

/**
 * An expand/collapse panel (accordion item) in the kit (boards `cd-korea*`, „Описание от продавача"): a panel whose
 * header is a real heading wrapping a toggle button (WAI-ARIA accordion pattern: `aria-expanded` + `aria-controls`),
 * the chevron turning orange and pointing up when open.
 *
 * The body animates between height 0 and its natural height with plain CSS: a one-row grid whose row goes `0fr` ↔
 * `1fr` — the "height: auto" a transition can reach — around an `overflow-hidden` child. Collapsed content STAYS in
 * the DOM, so the text remains crawlable/accessible even while collapsed. `prefers-reduced-motion` is honored (instant).
 *
 * Client component (owns the open state). Safe to drop into a server page as a small interactive island; `children`
 * still server-render inside it.
 */
export function ExpandableSection({
  title,
  children,
  defaultOpen = false,
  headingLevel = 2,
  className = "",
}: ExpandableSectionProps) {
  const [open, setOpen] = useState(defaultOpen);
  const panelId = useId();
  const buttonId = useId();

  const HeadingTag = `h${headingLevel}` as "h2" | "h3" | "h4";

  return (
    <section className={`sa-pnl cd-exp ${open ? "is-open" : ""} ${className}`}>
      <HeadingTag className="cd-exp__h">
        <button
          type="button"
          id={buttonId}
          aria-expanded={open}
          aria-controls={panelId}
          onClick={() => setOpen((v) => !v)}
        >
          <span>{title}</span>
          <ChevronDownIcon className="transition-transform duration-200 ease-out motion-reduce:transition-none" />
        </button>
      </HeadingTag>

      <div
        id={panelId}
        aria-labelledby={buttonId}
        className={`grid transition-[grid-template-rows,opacity] duration-300 ease-out motion-reduce:transition-none ${
          open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
        }`}
      >
        {/* The row can only collapse to 0 around a child with no minimum height
            and no padding of its own — hence this wrapper around the padded body. */}
        <div className="min-h-0 overflow-hidden">
          <div className="px-[clamp(18px,1.6vw,28px)] pb-[clamp(18px,1.6vw,28px)]">{children}</div>
        </div>
      </div>
    </section>
  );
}
