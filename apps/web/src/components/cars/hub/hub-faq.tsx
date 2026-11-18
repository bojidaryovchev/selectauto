import type { ReactNode } from "react";

export type HubFaqItem = { question: string; answer: string };

/** Hyphenated Bulgarian words („по-дълъг", „по-долу"), which a line must not break after the hyphen. */
const HYPHENATED = /([А-Яа-я]+-[А-Яа-я]+)/;

/**
 * The answer's text with each hyphenated word kept on one line (board `hm-model`, „по-дълъг"). Typesetting only: the
 * characters are the answer's own, which the FAQPage JSON-LD repeats verbatim.
 */
function keepHyphenatedWhole(text: string): ReactNode[] {
  return text
    .split(HYPHENATED)
    .map((part, i) => (i % 2 === 1 ? <span key={i} className="hm-nobr">{part}</span> : part));
}

/**
 * „Често задавани въпроси" on a model hub (boards `hm-model*`): the questions with their answers. Beside the sold-price
 * table from 1024 px; on its own (`solo`, no table) the list runs in two columns.
 */
export function HubFaq({ faq, solo }: { faq: HubFaqItem[]; solo: boolean }) {
  return (
    <section className={`hm-faq ${solo ? "hm-faq--solo" : ""}`} aria-labelledby="hm-faq-t">
      <h2 className="type-h2" id="hm-faq-t">
        Често задавани въпроси
      </h2>
      <dl className="hm-faq__list">
        {faq.map((f) => (
          <div key={f.question}>
            <dt>{f.question}</dt>
            <dd>{keepHyphenatedWhole(f.answer)}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
