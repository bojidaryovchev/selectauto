"use client";

import { useId, useState } from "react";
import { ChevronDownIcon } from "@/components/icons";

export type FaqAccordionItem = { question: string; answer: string };

/**
 * A page's „Често задавани въпроси" as the kit accordion (boards `im-*`: the calculators and the import hubs), on
 * every device, the first answer open. Each question is a heading wrapping a button with `aria-expanded` and
 * `aria-controls`; a closed answer stays in the page (hidden), so the FAQPage JSON-LD the page emits still matches
 * its content. The look is `.im-faq` in styles/import-page.css.
 */
export function FaqAccordion({ items, headingLevel = 3 }: { items: FaqAccordionItem[]; headingLevel?: 2 | 3 }) {
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

  return (
    <div className="im-faq">
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
