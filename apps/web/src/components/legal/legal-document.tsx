import type { ReactNode } from "react";
import { CalendarIcon } from "@/components/icons";
import { LegalToc } from "./legal-toc";

export type LegalSection = { id: string; num: string; title: string; content: ReactNode };

/**
 * The legal pages' document (boards `in-terms`, `in-privacy`, `in-cookies`): the title and the date of the last
 * update in the head band, then the contents beside the text, a 68ch column of numbered sections. The text is the
 * page's own, word for word (owner decision 25). The page's root carries `.in-legal-pg` (styles/info-legal.css).
 */
export function LegalDocument({
  title,
  updated,
  sections,
}: {
  title: string;
  updated: string;
  sections: LegalSection[];
}) {
  return (
    <>
      <section className="in-head">
        <div className="sa-wrap">
          <div className="in-box in-head__in">
            <h1 className="type-h1">{title}</h1>
            <p className="in-upd">
              <CalendarIcon />
              {updated}
            </p>
          </div>
        </div>
      </section>
      <section className="sa-band pt-[clamp(32px,3.4vw,56px)]">
        <div className="sa-wrap">
          <div className="in-box in-doc">
            <LegalToc items={sections.map(({ id, num, title: t }) => ({ id, num, title: t }))} />
            <article className="in-legal">
              {sections.map((s) => (
                // A jump puts the heading 22px under the contents bar below 1024px (in-legal-flow, frame 3: the bar
                // is 8px under the top bar and 66px tall) and 52px under the header on a desktop; the first section
                // has 4px of top padding instead of 28px.
                <section
                  key={s.id}
                  id={s.id}
                  className="max-lg:scroll-mt-[calc(var(--header-h)+68px)] max-lg:first:scroll-mt-[calc(var(--header-h)+92px)] lg:scroll-mt-[calc(var(--header-h)+24px)] lg:first:scroll-mt-[calc(var(--header-h)+48px)]"
                >
                  <h2>
                    <b>{s.num}</b> {s.title}
                  </h2>
                  {s.content}
                </section>
              ))}
            </article>
          </div>
        </div>
      </section>
    </>
  );
}
