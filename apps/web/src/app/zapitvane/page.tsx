import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { CalcBar } from "@/components/calculator";
import { WhyUsSection } from "@/components/home";
import { HubTestimonials, ImportProcess } from "@/components/hubs";
import { MailIcon, PhoneIcon } from "@/components/icons";
import { InquiryButton, InquiryPageQuiz } from "@/components/inquiry";
import { SiteFooter, SiteHeader } from "@/components/layout";
import { CONTACT, SITE_URL } from "@/constants";
import { PROCESS_STEPS } from "@/data/process";
import { buildSocialMeta } from "@/lib/social-meta";

const PATH = "/zapitvane";
const TITLE = "Безплатна консултация | SelectAuto";
const DESCRIPTION =
  "Безплатна консултация за внос на автомобил от Корея, САЩ и Канада. Отговорете на няколко кратки въпроса и ще се свържем с вас.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  // The ads' tags (utm_*, gclid, fbclid) make other addresses of this page; the canonical is the bare one.
  alternates: { canonical: `${SITE_URL}${PATH}` },
  ...buildSocialMeta({ title: TITLE, description: DESCRIPTION, path: PATH }),
};

/** The quiz card's id: the phone bar hides while it is on screen. */
const QUIZ_ID = "zapitvane-quiz";

/** The five steps of the process, numbered as the hubs number theirs. */
const STEPS = PROCESS_STEPS.map((s, i) => ({ n: String(i + 1), t: s.title, d: s.desc }));

/**
 * /zapitvane — „Безплатна консултация" as a page of its own, for ads to link to (owner decision 40; boards `ac-zap`,
 * `ac-zap-st`, `ac-zap-flow`, `ac-zap-tab`; parity check docs/design/parity/zapitvane.md).
 *
 * The hero: the title, the two lines the dialog and /kontakti already say, the phone and e-mail, and the quiz on the
 * page itself with its first question showing (InquiryPageQuiz, the dialog's own quiz). Then „Защо SelectAuto" as on
 * the home page, the five process steps as on the import hubs, and the reviews once the Places key exists. On a phone a
 * bar brings the quiz back once it has scrolled away.
 *
 * Static: everything is in the build except the reviews, which stream in behind their Suspense boundary. The forms
 * send the page's full address with the inquiry, so an ad's tags arrive with the lead (lib/lead-source.ts).
 */
export default function InquiryPage() {
  return (
    <>
      <SiteHeader />
      <main className="flex-1 pt-(--header-h)">
        {/* Desktop: the text and the links on the left, the card on the right. Below 1024 px they stack in the DOM's
            order — text, card, links — so a phone shows the first question and both answers above the tabs. */}
        <section className="ac-zp-hero" aria-labelledby="zapitvane-title">
          <div className="sa-wrap ac-zp-hero__in">
            <div className="ac-zp-hero__t">
              <span className="sa-tag sa-tag--or sa-tag--lg">Безплатно</span>
              <h1 id="zapitvane-title" className="type-h1">
                Безплатна консултация
              </h1>
              <p className="sa-lead">
                SelectAuto е вашият надежден партньор при избора, закупуването и доставката на мечтания автомобил от
                Корея, САЩ и Канада.
              </p>
              <p className="sa-p">
                Кажете ни какъв автомобил търсите, а ние ще ви помогнем да стигнете до правилния избор. Започнете
                кратката консултация и ще се свържем с вас.
              </p>
            </div>
            <InquiryPageQuiz id={QUIZ_ID} />
            <div className="ac-zp-links">
              <a href={CONTACT.phoneHref} className="sa-btn sa-btn--ton">
                <PhoneIcon />
                {CONTACT.phone}
              </a>
              <a href={CONTACT.emailHref} className="sa-btn sa-btn--ton">
                <MailIcon />
                {CONTACT.email}
              </a>
            </div>
          </div>
        </section>

        <WhyUsSection />

        <ImportProcess
          steps={STEPS}
          note={
            <>
              Пълното описание на процеса — стъпка по стъпка, с 3D визуализация — е на страницата{" "}
              <Link href="/proces">Процес</Link>.
            </>
          }
        />

        {/* Real Google reviews, once GOOGLE_PLACES_ID is set; nothing until then (fail-open). */}
        <Suspense fallback={null}>
          <HubTestimonials />
        </Suspense>

        {/* Phones: „Направете запитване" brings the quiz back; hidden while the card is on screen. On this page the
            inquiry button scrolls to the card instead of opening the dialog (InquiryPageQuiz). */}
        <CalcBar watchIds={[QUIZ_ID]}>
          <InquiryButton variant="pri" className="im-bar__b">
            Направете запитване
          </InquiryButton>
        </CalcBar>
      </main>
      <SiteFooter />
      {/* Room for the phone bar at the page's end (phones only, with the bar). */}
      <div className="sa-only-ph h-17.25" aria-hidden="true" />
    </>
  );
}
