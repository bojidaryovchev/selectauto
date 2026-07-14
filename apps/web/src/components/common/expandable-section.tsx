"use client";

import { useId, useState, type ReactNode } from "react";
import { motion, useReducedMotion } from "motion/react";
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
 * between height 0 and its natural height via Motion.
 *
 * Collapsed content STAYS in the DOM — Motion animates `height`, it does not unmount
 * (no `AnimatePresence`), so the text remains crawlable/accessible even while
 * collapsed. `prefers-reduced-motion` is honored (instant, no tween).
 *
 * Client component (owns the open state + Motion). Safe to drop into a server page
 * as a small interactive island; `children` still server-render inside it.
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
  const reduce = useReducedMotion();
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
          <motion.span
            aria-hidden
            animate={{ rotate: open ? 180 : 0 }}
            transition={reduce ? { duration: 0 } : { duration: 0.3, ease: "easeInOut" }}
            className="shrink-0 text-brand"
          >
            <ChevronDownIcon className="size-5" />
          </motion.span>
        </button>
      </HeadingTag>

      <motion.div
        id={panelId}
        aria-labelledby={buttonId}
        initial={false}
        animate={{ height: open ? "auto" : 0, opacity: open ? 1 : 0 }}
        transition={reduce ? { duration: 0 } : { duration: 0.32, ease: [0.32, 0.72, 0, 1] }}
        style={{ overflow: "hidden" }}
      >
        <div className={contentClassName}>{children}</div>
      </motion.div>
    </div>
  );
}
