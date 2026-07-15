import type { Metadata } from "next";
import { BudgetCalculator } from "@/components/calculator";
import { Container, LinkButton, Reveal } from "@/components/common";
import { InquiryButton } from "@/components/inquiry";
import { SiteFooter, SiteHeader } from "@/components/layout";
import { SITE_URL } from "@/constants";
import { buildBreadcrumbJsonLd, buildFaqJsonLd, type FaqEntry } from "@/lib/site-jsonld";

export const metadata: Metadata = {
  title: "Бюджетен калкулатор — каква кола мога да си позволя | SelectAuto",
  description:
    "Разберете каква цена автомобил отговаря на бюджета Ви. Въведете доход, разходи и желана месечна вноска — калкулаторът изчислява достъпната цена, влиянието върху бюджета и прогнозните условия.",
  alternates: { canonical: `${SITE_URL}/byudzheten-kalkulator` },
};

/**
 * /byudzheten-kalkulator — an affordability („каква кола мога да си позволя")
 * calculator, the second of the two „Инструменти" financial tools (the leasing
 * tool lives at /lizingov-kalkulator). Server component with SEO copy + FAQ +
 * JSON-LD; the interactive `<BudgetCalculator>` is a client island that deep-links
 * into the catalog by max price. Own top-level slug, cross-linked to the leasing +
 * import calculators.
 */

const FAQ: FaqEntry[] = [
  {
    question: "Каква кола мога да си позволя според доходите ми?",
    answer:
      "Достъпната цена зависи от желаната месечна вноска, срока и лихвените условия. Като ориентир месечната вноска за автомобил е добре да не надхвърля разумен дял от нетния Ви доход, след като приспаднете задълженията и разходите. Въведете дохода, разходите и желаната вноска, за да видите ориентировъчна ценова граница.",
  },
  {
    question: "Как се изчислява влиянието върху бюджета?",
    answer:
      "Влиянието върху бюджета е делът на желаната месечна вноска спрямо месечния Ви нетен доход. По-нисък процент означава по-комфортна вноска. Калкулаторът показва и свободния доход след разходи, за да прецените реалната поносимост.",
  },
  {
    question: "Какво включва прогнозната разбивка?",
    answer:
      "Разбивката включва прогнозен ГПР, ориентировъчна първоначална вноска, остатъчна стойност и обща сума на кредита при избраните параметри. Стойностите са ориентировъчни допускания, които реалната оферта може да коригира според профила на клиента.",
  },
  {
    question: "Обвързваща ли е сумата от калкулатора?",
    answer:
      "Не. Изчисленията са ориентировъчни и не представляват оферта за кредит. Реалните условия варират според одобрението, срока и избрания автомобил. За точна калкулация направете запитване.",
  },
];

export default function BudgetCalculatorPage() {
  const faqJsonLd = buildFaqJsonLd(FAQ);
  const breadcrumbJsonLd = buildBreadcrumbJsonLd([
    { name: "Начало", url: "/" },
    { name: "Бюджетен калкулатор", url: "/byudzheten-kalkulator" },
  ]);

  return (
    <>
      <SiteHeader />
      <main className="flex-1 bg-[#fafafa] pt-(--header-h) text-ink">
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />

        <Container className="max-w-300 py-12 max-md:py-8">
          <h1 className="mb-3 text-4xl font-black uppercase tracking-tight text-ink max-md:text-3xl">
            Бюджетен калкулатор
          </h1>
          <p className="mb-8 max-w-2xl text-[15px] leading-[1.8] text-[#3d4046]">
            Планирайте покупката спрямо бюджета си. Въведете месечния си доход, разходите и желаната вноска, а
            калкулаторът показва каква цена автомобил отговаря на бюджета Ви, влиянието върху месечните финанси и
            прогнозна разбивка на финансирането.
          </p>

          <BudgetCalculator />

          {/* Explainer — real, indexable content */}
          <Reveal className="mt-12">
            <section>
              <h2 className="mb-4 text-2xl font-black text-ink">Как да разчетете резултата</h2>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {[
                  { t: "Достъпна цена", d: "Ориентировъчният ценови диапазон автомобил, който отговаря на зададената вноска и срок." },
                  { t: "Влияние върху бюджета", d: "Делът на месечната вноска спрямо нетния Ви доход — по-нисък процент е по-комфортен." },
                  { t: "Свободен доход след разходи", d: "Остатъкът от дохода след приспадане на месечните задължения и разходи." },
                  { t: "Прогнозна разбивка", d: "Ориентировъчен ГПР, първоначална вноска, остатъчна стойност и обща сума на кредита." },
                ].map((c) => (
                  <div
                    key={c.t}
                    className="rounded-2xl border border-line bg-white p-5 shadow-card transition-all duration-200 hover:-translate-y-0.5 hover:border-brand/40 hover:shadow-card-strong"
                  >
                    <h3 className="mb-1.5 text-lg font-extrabold text-ink">{c.t}</h3>
                    <p className="text-sm/relaxed text-[#5a5d64]">{c.d}</p>
                  </div>
                ))}
              </div>
            </section>
          </Reveal>

          {/* FAQ (visible — matches the FAQPage JSON-LD) */}
          <Reveal className="mt-12">
            <section>
              <h2 className="mb-4 text-2xl font-black text-ink">Често задавани въпроси</h2>
              <div className="flex flex-col gap-4">
                {FAQ.map((f) => (
                  <div
                    key={f.question}
                    className="rounded-2xl border border-line bg-white p-5 shadow-card transition-colors duration-200 hover:border-brand/40"
                  >
                    <h3 className="mb-1.5 text-base font-extrabold text-ink">{f.question}</h3>
                    <p className="text-sm/relaxed text-[#5a5d64]">{f.answer}</p>
                  </div>
                ))}
              </div>
            </section>
          </Reveal>

          {/* Cross-links to the other tools */}
          <Reveal className="mt-12">
            <section>
              <h2 className="mb-4 text-2xl font-black text-ink">Свързани инструменти</h2>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <LinkButton
                  href="/lizingov-kalkulator"
                  rippleTheme="dark"
                  className="group block rounded-2xl border border-line bg-white p-5 shadow-card transition-all duration-200 hover:-translate-y-0.5 hover:border-brand/50 hover:shadow-card-strong"
                >
                  <h3 className="mb-1.5 text-lg font-extrabold text-ink transition-colors group-hover:text-brand-dark">Лизингов калкулатор</h3>
                  <p className="text-sm/relaxed text-[#5a5d64]">Изчислете месечната вноска по цена, аванс, срок и ГПР.</p>
                </LinkButton>
                <LinkButton
                  href="/kalkulator"
                  rippleTheme="dark"
                  className="group block rounded-2xl border border-line bg-white p-5 shadow-card transition-all duration-200 hover:-translate-y-0.5 hover:border-brand/50 hover:shadow-card-strong"
                >
                  <h3 className="mb-1.5 text-lg font-extrabold text-ink transition-colors group-hover:text-brand-dark">Калкулатор за внос</h3>
                  <p className="text-sm/relaxed text-[#5a5d64]">Ориентировъчна цена за внос от Корея, САЩ или Канада.</p>
                </LinkButton>
              </div>
            </section>
          </Reveal>

          {/* CTA */}
          <Reveal className="mt-12">
            <section className="rounded-card bg-linear-to-r from-brand-dark to-brand p-8 text-center max-md:p-6">
              <h2 className="mb-2 text-2xl font-black text-white max-md:text-xl">Готов да намериш своя автомобил?</h2>
              <p className="mx-auto mb-5 max-w-xl text-sm/relaxed text-white/85">
                Кажи ни бюджета и предпочитанията си — ще подберем подходящи автомобили и ще съдействаме за финансирането.
              </p>
              <InquiryButton
                rippleTheme="dark"
                className="inline-flex min-h-13.5 items-center justify-center rounded-full bg-white px-8 text-sm font-extrabold uppercase tracking-wide text-brand-dark transition-transform duration-200 hover:-translate-y-0.5"
              >
                Направи запитване
              </InquiryButton>
            </section>
          </Reveal>
        </Container>
      </main>
      <SiteFooter />
    </>
  );
}
