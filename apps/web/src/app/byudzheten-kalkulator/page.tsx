import type { Metadata } from "next";
import { BudgetCalculator, FinanceToolPage } from "@/components/calculator";
import { CalculatorIcon, CarIcon, GaugeIcon, ListChecksIcon, PercentIcon, WalletIcon } from "@/components/icons";
import { SiteFooter, SiteHeader } from "@/components/layout";
import { SITE_URL } from "@/constants";
import { buildBreadcrumbJsonLd, buildFaqJsonLd, buildWebApplicationJsonLd, type FaqEntry } from "@/lib/site-jsonld";
import { buildSocialMeta } from "@/lib/social-meta";

export const metadata: Metadata = {
  title: "Бюджетен калкулатор — каква кола мога да си позволя | SelectAuto",
  description:
    "Разберете каква цена автомобил отговаря на бюджета Ви. Въведете доход, разходи и желана месечна вноска — калкулаторът изчислява достъпната цена, влиянието върху бюджета и прогнозните условия.",
  alternates: { canonical: `${SITE_URL}/byudzheten-kalkulator` },
  ...buildSocialMeta({
    title: "Бюджетен калкулатор — каква кола мога да си позволя | SelectAuto",
    description:
      "Въведете доход, разходи и желана месечна вноска — вижте достъпната цена автомобил за Вашия бюджет.",
    path: "/byudzheten-kalkulator",
  }),
};

/**
 * /byudzheten-kalkulator (boards `im-budget*`; parity check docs/design/parity/byudzheten-kalkulator.md) — an
 * affordability („каква кола мога да си позволя") calculator, the second of the two „Инструменти" financial tools (the leasing
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
  const webAppJsonLd = buildWebApplicationJsonLd({
    name: "Бюджетен калкулатор",
    description:
      "Онлайн калкулатор каква цена автомобил можете да си позволите според доход, разходи и месечна вноска.",
    url: "/byudzheten-kalkulator",
    category: "FinanceApplication",
  });

  return (
    <>
      <SiteHeader />
      <main className="flex-1 pt-(--header-h)">
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(webAppJsonLd) }} />

        <FinanceToolPage
          crumb="Бюджетен калкулатор"
          title="Бюджетен калкулатор"
          lead="Планирайте покупката спрямо бюджета си. Въведете месечния си доход, разходите и желаната вноска, а калкулаторът показва каква цена автомобил отговаря на бюджета Ви, влиянието върху месечните финанси и прогнозна разбивка на финансирането."
          calculator={<BudgetCalculator />}
          explainer={[
            {
              Icon: CarIcon,
              t: "Достъпна цена",
              d: "Ориентировъчният ценови диапазон автомобил, който отговаря на зададената вноска и срок.",
            },
            {
              Icon: GaugeIcon,
              t: "Влияние върху бюджета",
              d: "Делът на месечната вноска спрямо нетния Ви доход — по-нисък процент е по-комфортен.",
            },
            {
              Icon: WalletIcon,
              t: "Свободен доход след разходи",
              d: "Остатъкът от дохода след приспадане на месечните задължения и разходи.",
            },
            {
              Icon: ListChecksIcon,
              t: "Прогнозна разбивка",
              d: "Ориентировъчен ГПР, първоначална вноска, остатъчна стойност и обща сума на кредита.",
            },
          ]}
          faq={FAQ}
          related={[
            {
              Icon: PercentIcon,
              href: "/lizingov-kalkulator",
              t: "Лизингов калкулатор",
              d: "Изчислете месечната вноска по цена, аванс, срок и ГПР.",
            },
            {
              Icon: CalculatorIcon,
              href: "/kalkulator",
              t: "Калкулатор за внос",
              d: "Ориентировъчна цена за внос от Корея, САЩ или Канада.",
            },
          ]}
          cta={{
            title: "Готови ли сте да намерите своя автомобил?",
            text: "Кажете ни бюджета и предпочитанията си — ще подберем подходящи автомобили и ще съдействаме за финансирането.",
          }}
        />
      </main>
      <SiteFooter />
      {/* Room for the phone result bar at the page's end (phones only, with the bar). */}
      <div className="sa-only-ph h-16.25" aria-hidden="true" />
    </>
  );
}
