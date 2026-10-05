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
  /** Override the outer card container classes. */
  className?: string;
  /** Override the title classes. */
  titleClassName?: string;
  /** Override the expanded body's inner padding classes. */
  contentClassName?: string;
};

/**
 * A reusable expand/collapse section (accordion item). The header is a real heading
 * wrapping a toggle button (WAI-ARIA accordion pattern: `aria-expanded` +
 * `aria-controls`); the chevron rotates on toggle and the body animates fluidly
 * between height 0 and its natural height.
 *
 * The animation is plain CSS: the body is a one-row grid whose row goes
 * `0fr` ↔ `1fr` — the "height: auto" a transition can reach — around an
 * `overflow-hidden` child. (It used to be the Motion library, which cost ~120KB
 * of script, ~35KB compressed, for these two tweens.) Collapsed content STAYS in
 * the DOM, so the text remains crawlable/accessible even while collapsed.
 * `prefers-reduced-motion` is honored via `motion-reduce` (instant, no tween).
 *
 * Client component (owns the open state). Safe to drop into a server page as a
 * small interactive island; `children` still server-render inside it.
 */
export function ExpandableSection({
  title,
  children,
  defaultOpen = false,
  headingLevel = 2,
  className = "rounded-2xl border border-line bg-white shadow-card",
  titleClassName = "text-lg font-black uppercase tracking-tight text-ink",
  contentClassName = "px-6 pb-6 max-md:px-5 max-md:pb-5",
}: ExpandableSectionProps) {
  const [open, setOpen] = useState(defaultOpen);
  const panelId = useId();
  const buttonId = useId();

  const HeadingTag = `h${headingLevel}` as "h2" | "h3" | "h4";

  return (
    <div className={className}>
      <HeadingTag>
        <button
          type="button"
          id={buttonId}
          aria-expanded={open}
          aria-controls={panelId}
          onClick={() => setOpen((v) => !v)}
          className="flex w-full cursor-pointer items-center justify-between gap-4 p-6 text-left max-md:p-5 focus-visible:outline-2 focus-visible:outline-brand focus-visible:-outline-offset-2"
        >
          <span className={titleClassName}>{title}</span>
          <span
            aria-hidden
            className={`shrink-0 text-brand transition-transform duration-300 ease-in-out motion-reduce:transition-none ${
              open ? "rotate-180" : ""
            }`}
          >
            <ChevronDownIcon className="size-5" />
          </span>
        </button>
      </HeadingTag>

      <div
        id={panelId}
        aria-labelledby={buttonId}
        className={`grid transition-[grid-template-rows,opacity] duration-320 ease-[cubic-bezier(0.32,0.72,0,1)] motion-reduce:transition-none ${
          open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
        }`}
      >
        {/* The row can only collapse to 0 around a child with no minimum height
            and no padding of its own — hence this wrapper around the padded body. */}
        <div className="min-h-0 overflow-hidden">
          <div className={contentClassName}>{children}</div>
        </div>
      </div>
    </div>
  );
}
