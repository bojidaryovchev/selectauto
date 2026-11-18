import { type ComponentType, type ReactNode, Suspense } from "react";
import Link from "next/link";
import { buttonClasses, FaqAccordion, type FaqAccordionItem, SectionHeading } from "@/components/common";
import { CalcBar, CostEstimator } from "@/components/calculator";
import { CalculatorIcon } from "@/components/icons";
import { InquiryButton } from "@/components/inquiry";
import type { MarketId } from "@/data/import-rates";
import { FeaturedCars, FeaturedCarsLoading } from "./featured-cars";

/** An icon component (components/icons). */
export type HubIcon = ComponentType<{ className?: string }>;

/**
 * The import hubs' sections (boards `im-hub-kr`, `im-hub-us`, `im-hub-ca`; parity check
 * docs/design/parity/vnos-na-koli.md). Each page keeps its own copy and data and composes these in the order the code
 * always had. The look is `.im-*` in styles/import-page.css.
 */

/** A section's title, with the optional intro the boards set as body text (68ch). */
function SectionIntro({ title, intro }: { title: string; intro?: ReactNode }) {
  return (
    <div className="sa-sh">
      <div className="sa-sh__l">
        <h2 className="type-h2">{title}</h2>
        {intro ? <p className="sa-p sa-measure">{intro}</p> : null}
      </div>
    </div>
  );
}

/**
 * The hero: the breadcrumb, the H1 with the market's flag, the two paragraphs and two actions (the inquiry, and a jump
 * to the calculator), and the reasons beside them (below them under 1024 px).
 */
export function ImportHero({
  crumb,
  title,
  Flag,
  lead,
  text,
  calcId,
  actionsId,
  whyId,
  whyTitle,
  reasons,
}: {
  crumb: string;
  title: string;
  Flag: HubIcon;
  lead: ReactNode;
  text: ReactNode;
  /** The calculator section's id: „Калкулатор за внос" jumps there. */
  calcId: string;
  /** The actions' id: the phone bar hides while they are on screen. */
  actionsId: string;
  whyId: string;
  whyTitle: string;
  reasons: { Icon: HubIcon; t: string; d: string }[];
}) {
  return (
    <section className="sa-band sa-band--tight im-hero">
      <div className="sa-wrap">
        <nav className="sa-crumbs" aria-label="Пътечка">
          <Link href="/">Начало</Link>
          <i aria-hidden="true">/</i>
          <span aria-current="page">{crumb}</span>
        </nav>
        <div className="im-hero__g">
          <div className="im-hero__t">
            <h1 className="type-h1 im-h1">
              <Flag className="sa-flag" />
              {title}
            </h1>
            <p className="sa-lead">{lead}</p>
            <p className="sa-p">{text}</p>
            <div id={actionsId} className="im-hero__act">
              <InquiryButton variant="pri">Направете запитване</InquiryButton>
              <a href={`#${calcId}`} className={buttonClasses({ variant: "sec" })}>
                <CalculatorIcon />
                Калкулатор за внос
              </a>
            </div>
          </div>
          <aside className="im-why" aria-labelledby={whyId}>
            <h2 className="im-why__t" id={whyId}>
              {whyTitle}
            </h2>
            <ul>
              {reasons.map(({ Icon, t, d }) => (
                <li key={t}>
                  <span className="im-ic">
                    <Icon />
                  </span>
                  <div>
                    <h3>{t}</h3>
                    <p>{d}</p>
                  </div>
                </li>
              ))}
            </ul>
          </aside>
        </div>
      </div>
    </section>
  );
}

/** An article band: its icon and title on the left, the paragraphs (68ch) on the right; stacked under 1024 px. */
export function ImportArticle({ Icon, title, children }: { Icon: HubIcon; title: string; children: ReactNode }) {
  return (
    <section className="sa-band sa-band--tight sa-band--line">
      <div className="sa-wrap">
        <div className="im-art">
          <div className="im-art__h">
            <span className="im-ic">
              <Icon />
            </span>
            <h2 className="type-h2">{title}</h2>
          </div>
          <div className="im-art__b">{children}</div>
        </div>
      </div>
    </section>
  );
}

/** The calculator band, preset to the hub's market; the hero's „Калкулатор за внос" and the phone bar jump here. */
export function ImportCalculator({
  id,
  title,
  intro,
  market,
}: {
  id: string;
  title: string;
  intro: ReactNode;
  market: MarketId;
}) {
  return (
    <section id={id} className="sa-band sa-band--tight sa-band--line scroll-mt-(--header-h)">
      <div className="sa-wrap">
        <SectionIntro title={title} intro={intro} />
        <CostEstimator defaultMarket={market} />
      </div>
    </section>
  );
}

const TONE = { pos: "is-pos", warn: "is-warn", info: "is-info", neg: "is-neg" } as const;

/**
 * Cards with an icon and a title: two side by side (one column under 1024 px), or four (`columns={4}`, the kit grid,
 * the US title types, whose icons take the state colours). An optional title and intro above, a note below.
 */
export function ImportCards({
  title,
  intro,
  columns = 2,
  headingLevel = 3,
  items,
  note,
}: {
  title?: string;
  intro?: ReactNode;
  columns?: 2 | 4;
  headingLevel?: 2 | 3;
  items: { Icon: HubIcon; tone?: keyof typeof TONE; t: string; body: ReactNode }[];
  note?: ReactNode;
}) {
  const Heading = headingLevel === 2 ? "h2" : "h3";
  return (
    <section className="sa-band sa-band--tight sa-band--line">
      <div className="sa-wrap">
        {title ? <SectionIntro title={title} intro={intro} /> : null}
        <div className={columns === 4 ? "sa-grid sa-grid--4" : "im-duo"}>
          {items.map(({ Icon, tone, t, body }) => (
            <article key={t} className="im-card">
              <div className="im-card__h">
                <span className={tone ? `im-ic ${TONE[tone]}` : "im-ic"}>
                  <Icon />
                </span>
                <Heading>{t}</Heading>
              </div>
              {body}
            </article>
          ))}
        </div>
        {note ? <p className="im-note">{note}</p> : null}
      </div>
    </section>
  );
}

/** „Процесът стъпка по стъпка": five numbered steps (a list on a phone, two columns on a tablet), a note under them. */
export function ImportProcess({ steps, note }: { steps: { n: string; t: string; d: string }[]; note?: ReactNode }) {
  return (
    <section className="sa-band sa-band--tight sa-band--line">
      <div className="sa-wrap">
        <SectionHeading title="Процесът стъпка по стъпка" />
        <ol className="im-proc">
          {steps.map((s) => (
            <li key={s.n}>
              <span className="im-proc__n" aria-hidden="true">
                {s.n}
              </span>
              <h3>{s.t}</h3>
              <p>{s.d}</p>
            </li>
          ))}
        </ol>
        {note ? <p className="im-note">{note}</p> : null}
      </div>
    </section>
  );
}

/**
 * The closing band: links to the other markets and the calculator (flags at the kit's 21 × 14, which the chip's own
 * 16 px icon size would shrink), and the call to action, whose id the phone bar watches.
 */
export function ImportEnd({
  links,
  ctaId,
  ctaTitle,
  ctaText,
}: {
  links: { href: string; label: string; Icon: HubIcon; flag?: boolean }[];
  ctaId: string;
  ctaTitle: string;
  ctaText: string;
}) {
  return (
    <section className="sa-band sa-band--tight sa-band--line">
      <div className="sa-wrap">
        <div className="im-end">
          <div>
            <SectionHeading title="Сравнете с другите пазари" />
            <nav className="sa-chips" aria-label="Сравнете с другите пазари">
              {links.map(({ href, label, Icon, flag }) => (
                <Link key={href} href={href} className="sa-chip">
                  <Icon className={flag ? "sa-flag h-3.5 w-5.25" : undefined} />
                  {label}
                </Link>
              ))}
            </nav>
          </div>
          <div id={ctaId} className="im-cta">
            <div className="im-cta__t">
              <h2 className="type-h2">{ctaTitle}</h2>
              <p className="sa-lead">{ctaText}</p>
            </div>
            <InquiryButton variant="pri" size="xl">
              Направете запитване
            </InquiryButton>
          </div>
        </div>
      </div>
    </section>
  );
}

/** The listings band: the rail streams in behind its skeleton, so the page around it never waits for the DB. */
export function ImportFeaturedCars({
  market,
  title,
  allHref,
  emptyText,
}: {
  market: MarketId;
  title: string;
  allHref: string;
  emptyText: string;
}) {
  return (
    <section className="sa-band sa-band--tight sa-band--line">
      <div className="sa-wrap">
        <Suspense fallback={<FeaturedCarsLoading title={title} allHref={allHref} />}>
          <FeaturedCars market={market} title={title} allHref={allHref} emptyText={emptyText} />
        </Suspense>
      </div>
    </section>
  );
}

/** „Често задавани въпроси": the kit accordion, the first answer open; every answer stays in the page (FAQPage). */
export function ImportFaq({ items }: { items: FaqAccordionItem[] }) {
  return (
    <section className="sa-band sa-band--tight sa-band--line">
      <div className="sa-wrap">
        <SectionHeading title="Често задавани въпроси" />
        <FaqAccordion items={items} />
      </div>
    </section>
  );
}

/**
 * The phone bar (boards `im-hub-*-p`, `im-hub-flow` frame 1): the jump to the calculator and the inquiry. It hides
 * while the hero's actions, the calculator or the closing call to action is on screen (README, bars), so a view never
 * shows the same primary action twice. The page reserves its 69 px after the footer.
 */
export function ImportBar({ calcId, actionsId, ctaId }: { calcId: string; actionsId: string; ctaId: string }) {
  return (
    <CalcBar watchIds={[actionsId, calcId, ctaId]}>
      <a className="sa-ib sa-ib--lg" href={`#${calcId}`} aria-label="Калкулатор за внос">
        <CalculatorIcon />
      </a>
      <InquiryButton variant="pri" className="im-bar__b">
        Направете запитване
      </InquiryButton>
    </CalcBar>
  );
}
