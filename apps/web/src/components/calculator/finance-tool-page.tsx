import type { ComponentType, ReactNode } from "react";
import Link from "next/link";
import { FaqAccordion, type FaqAccordionItem, Reveal, SectionHeading } from "@/components/common";
import { ArrowRightIcon } from "@/components/icons";
import { InquiryButton } from "@/components/inquiry";

type Icon = ComponentType<{ className?: string }>;

/**
 * The page around a financing calculator (boards `im-leasing`, `im-budget`): the hero with its breadcrumb (the trail
 * the page's JSON-LD already describes, now visible), the calculator, „Как да разчетете резултата" as cards with an
 * icon each, the FAQ as the kit accordion, then the related tools beside the closing call to action. The page passes
 * its own copy; the sections below the calculator fade in as before (`Reveal`).
 */
export function FinanceToolPage({
  crumb,
  title,
  lead,
  calculator,
  explainer,
  faq,
  related,
  cta,
}: {
  /** The breadcrumb's last step (the page's name). */
  crumb: string;
  title: string;
  lead: string;
  calculator: ReactNode;
  explainer: { Icon: Icon; t: string; d: string }[];
  faq: FaqAccordionItem[];
  related: { Icon: Icon; href: string; t: string; d: string }[];
  cta: { title: string; text: string };
}) {
  return (
    <>
      <section className="sa-band sa-band--tight im-hero">
        <div className="sa-wrap">
          <nav className="sa-crumbs" aria-label="Пътечка">
            <Link href="/">Начало</Link>
            <i aria-hidden="true">/</i>
            <span aria-current="page">{crumb}</span>
          </nav>
          <div className="im-hero__g im-hero__g--1">
            <div className="im-hero__t">
              <h1 className="type-h1">{title}</h1>
              <p className="sa-lead">{lead}</p>
            </div>
          </div>
        </div>
      </section>

      <section className="sa-band sa-band--tight">
        <div className="sa-wrap">{calculator}</div>
      </section>

      {/* Explainer — real, indexable content */}
      <Reveal>
        <section className="sa-band sa-band--tight sa-band--line">
          <div className="sa-wrap">
            <SectionHeading title="Как да разчетете резултата" />
            <div className="sa-grid sa-grid--4">
              {explainer.map(({ Icon, t, d }) => (
                <article key={t} className="im-card">
                  <div className="im-card__h">
                    <span className="im-ic">
                      <Icon />
                    </span>
                    <h3>{t}</h3>
                  </div>
                  <p>{d}</p>
                </article>
              ))}
            </div>
          </div>
        </section>
      </Reveal>

      {/* FAQ (the answers stay in the page, matching the FAQPage JSON-LD) */}
      <Reveal>
        <section className="sa-band sa-band--tight sa-band--line">
          <div className="sa-wrap">
            <SectionHeading title="Често задавани въпроси" />
            <FaqAccordion items={faq} />
          </div>
        </section>
      </Reveal>

      {/* Cross-links to the other tools, and the closing call to action */}
      <Reveal>
        <section className="sa-band sa-band--tight sa-band--line">
          <div className="sa-wrap">
            <div className="im-end">
              <div>
                <SectionHeading title="Свързани инструменти" />
                <div className="sa-grid sa-grid--2">
                  {related.map(({ Icon, href, t, d }) => (
                    <Link key={href} href={href} className="im-link">
                      <span className="im-ic">
                        <Icon />
                      </span>
                      <span>
                        <b>{t}</b>
                        <span>{d}</span>
                      </span>
                      <ArrowRightIcon />
                    </Link>
                  ))}
                </div>
              </div>
              <div className="im-cta">
                <div className="im-cta__t">
                  <h2 className="type-h2">{cta.title}</h2>
                  <p className="sa-lead">{cta.text}</p>
                </div>
                <InquiryButton variant="pri" size="xl">
                  Направете запитване
                </InquiryButton>
              </div>
            </div>
          </div>
        </section>
      </Reveal>
    </>
  );
}
