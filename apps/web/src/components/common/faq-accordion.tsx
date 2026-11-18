"use client";

import { useId, useState } from "react";
import { ChevronDownIcon } from "@/components/icons";

export type FaqAccordionItem = { question: string; answer: string };

/**
 * A page's „Често задавани въпроси" as an accordion, on every device, the first answer open; any number can be open.
 * Each question is a heading wrapping a button with `aria-expanded` and `aria-controls`; a closed answer stays in the
 * page (hidden), so the FAQPage JSON-LD the page emits still matches its content.
 *
 * - `look="im"` (default): the boards `im-*`, the calculators and the import hubs (`.im-faq`, styles/import-page.css).
 * - `look="kit"`: the kit's accordion in a panel (`.sa-pnl.sa-acc`), the FAQ page (board `in-faq`); `className` adds
 *   the page's own class.
 */
export function FaqAccordion({
  items,
  headingLevel = 3,
  look = "im",
  className = "",
}: {
  items: FaqAccordionItem[];
  headingLevel?: 2 | 3;
  look?: "im" | "kit";
  className?: string;
}) {
  const uid = useId();
  const [open, setOpen] = useState<Set<number>>(() => new Set([0]));
  const Heading = `h${headingLevel}` as "h2" | "h3";

  const toggle = (i: number) =>
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });

  if (look === "kit") {
    return (
      <div className={`sa-pnl sa-acc ${className}`}>
        {items.map((item, i) => {
          const isOpen = open.has(i);
          const answerId = `${uid}-a${i}`;
          return (
            <div key={item.question} className={isOpen ? "is-open" : undefined}>
              <Heading>
                <button type="button" aria-expanded={isOpen} aria-controls={answerId} onClick={() => toggle(i)}>
                  {item.question}
                  <ChevronDownIcon />
                </button>
              </Heading>
              <p id={answerId} className="sa-acc__a" hidden={!isOpen}>
                {item.answer}
              </p>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className={`im-faq ${className}`}>
      {items.map((item, i) => {
        const isOpen = open.has(i);
        const answerId = `${uid}-a${i}`;
        return (
          <div key={item.question} className={`im-faq__i ${isOpen ? "is-open" : ""}`}>
            <Heading className="im-faq__h">
              <button
                type="button"
                className="im-faq__q"
                aria-expanded={isOpen}
                aria-controls={answerId}
                onClick={() => toggle(i)}
              >
                {item.question}
                <ChevronDownIcon />
              </button>
            </Heading>
            <p id={answerId} className="im-faq__a">
              {item.answer}
            </p>
          </div>
        );
      })}
    </div>
  );
}
