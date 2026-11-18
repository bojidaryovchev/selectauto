import type { Metadata } from "next";
import Link from "next/link";
import { LegalDocument } from "@/components/legal";
import { SiteFooter, SiteHeader } from "@/components/layout";
import { BUSINESS, CONTACT, SITE_NAME, SITE_URL } from "@/constants";
import { buildSocialMeta } from "@/lib/social-meta";

const TITLE = "Политика за поверителност | SelectAuto";
const DESCRIPTION =
  "Как SelectAuto събира, използва и защитава личните ви данни — съгласно Регламент (ЕС) 2016/679 (GDPR). Какви данни обработваме, на какво основание, за колко време и какви са вашите права.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: `${SITE_URL}/politika-za-poveritelnost` },
  // Its own share URL: without this the page inherited the layout's, the home page.
  ...buildSocialMeta({ title: TITLE, description: DESCRIPTION, path: "/politika-za-poveritelnost" }),
};

/** The e-mail link the page repeats. */
function EmailLink() {
  return (
    <a href={CONTACT.emailHref} className="underline underline-offset-3">
      {CONTACT.email}
    </a>
  );
}

/**
 * /politika-za-poveritelnost — privacy policy. Previously a dead footer link
 * (`FOOTER_INFO` pointed here with no route). Real, GDPR-aware content (the
 * business is EU-based and collects personal data via the inquiry/carfax forms
 * and user accounts), so it's substantive and indexable (low priority — see
 * sitemap). Static; NAP from `@/constants`.
 *
 * Look: board `in-privacy` (components/legal; parity check docs/design/parity/legal.md). The text is word for word
 * (owner decision 25), with the owner's later fixes, checked against GDPR art. 13 and the code on 18.11.2026:
 *  - §1 names the company as the controller (decision 30, PR1), from BUSINESS (Търговски регистър);
 *  - §2–§7 cover what the business really processes (decision 33): contracts and payments, the calculator e-mail,
 *    favourite alerts, the mailbox, de-index requests, the IP stored with every lead (inquiries, calculator_offers,
 *    carfax_requests.user_ip), Vercel Web Analytics; the recipients; transfers outside the EU (adequacy: Canada, the
 *    Republic of Korea and DPF-certified US companies, ec.europa.eu „Adequacy decisions"); retention (12 months for
 *    leads without a contract, the owner's figure; ЗСч чл. 12; ЗЗД чл. 110); required data; the cookie policy.
 * The 12 months is a promise: leads older than that must actually be deleted (see REDESIGN.md).
 */
export default function PrivacyPolicyPage() {
  return (
    <>
      <SiteHeader />
      <main className="in-legal-pg flex-1 pt-(--header-h)">
        <LegalDocument
          title="Политика за поверителност"
          updated="Последна актуализация: ноември 2026 г."
          sections={[
            {
              id: "razdel-1",
              num: "1.",
              title: "Кои сме ние (Администратор на данни)",
              content: (
                <p>
                  {BUSINESS.registeredName} („{SITE_NAME}&ldquo;), ЕИК {BUSINESS.companyId}, със седалище и адрес на
                  управление: {BUSINESS.registeredOffice.streetAddress}, {BUSINESS.registeredOffice.postalCode}{" "}
                  {BUSINESS.registeredOffice.city}, обработва Вашите лични данни като администратор по смисъла на
                  Регламент (ЕС) 2016/679 (GDPR). Можете да се свържете с нас на адрес {BUSINESS.streetAddress},{" "}
                  {BUSINESS.city}, България, на телефон {CONTACT.phone} или на имейл <EmailLink />.
                </p>
              ),
            },
            {
              id: "razdel-2",
              num: "2.",
              title: "Какви данни събираме",
              content: (
                <ul>
                  <li>
                    <strong>Данни за контакт</strong> — име, телефон и имейл, които ни предоставяте чрез формите за
                    запитване, заявка за Carfax или при регистрация на профил.
                  </li>
                  <li>
                    <strong>Данни за запитването</strong> — марка/модел, бюджет, предпочитания и съобщения, които ни
                    изпращате, за да обработим запитването Ви.
                  </li>
                  <li>
                    <strong>Данни от калкулатора</strong> — име, телефон, имейл и параметрите на изчислението, когато
                    поискате разбивката по имейл.
                  </li>
                  <li>
                    <strong>Данни по договор</strong> — при договор за посредничество, доставка или депозит: имена, ЕГН
                    (за юридическо лице — ЕИК и представляващ), адрес, имейл и телефон; данни за автомобила (марка,
                    модел, VIN); суми, плащания, известия за плащане и платежните документи, които ни изпращате.
                  </li>
                  <li>
                    <strong>Данни за профил</strong> — при регистрация: имейл и (за вход с парола) защитен с хеширане
                    пароловен запис; при вход с Google — основни профилни данни, предоставени от Google.
                  </li>
                  <li>
                    <strong>Любими и известия</strong> — автомобилите, които запазвате в профила си; ако включите
                    известията, Ви изпращаме имейл в деня на търга им.
                  </li>
                  <li>
                    <strong>Кореспонденция</strong> — имейлите, които ни изпращате на {CONTACT.email}, и отговорите ни.
                  </li>
                  <li>
                    <strong>Заявки за премахване на обява</strong> — името и данните за връзка на собственика на
                    автомобила и начинът, по който е доказал собствеността си.
                  </li>
                  <li>
                    <strong>Технически данни</strong> — IP адрес, тип браузър и подобни данни, събирани автоматично при
                    използване на сайта. IP адреса записваме и с всяко запитване, заявка за Carfax и оферта от
                    калкулатора, за да ограничим злоупотребите.
                  </li>
                  <li>
                    <strong>Статистика за посещенията</strong> — Vercel Web Analytics отчита посещенията обобщено
                    (страница, източник, държава, браузър и вид устройство) без бисквитки: посетителят се разпознава по
                    хеш на заявката, а сесията му се изтрива след 24 часа.
                  </li>
                </ul>
              ),
            },
            {
              id: "razdel-3",
              num: "3.",
              title: "За какво използваме данните и на какво основание",
              content: (
                <ul>
                  <li>
                    За да отговорим на Вашите запитвания, да Ви изпратим разбивката от калкулатора и да предоставим
                    услугите по внос на автомобил — на основание предприемане на стъпки по Ваше искане преди сключване
                    на договор (чл. 6, ал. 1, б. „б&ldquo;).
                  </li>
                  <li>
                    За сключване и изпълнение на договор — за внос на автомобил, за депозит или за премахване на обява,
                    включително плащанията, митническото оформяне и регистрацията на автомобила — на основание
                    изпълнение на договора (чл. 6, ал. 1, б. „б&ldquo;).
                  </li>
                  <li>
                    За създаване и управление на потребителски профил, списък с любими и известията за търгове — на
                    основание изпълнение на услугата, която заявявате.
                  </li>
                  <li>
                    За поддръжка, сигурност и подобряване на сайта, включително обобщената статистика за посещенията —
                    на основание нашия легитимен интерес (чл. 6, ал. 1, б. „е&ldquo;).
                  </li>
                  <li>
                    За защита на правата ни при спор и за ограничаване на злоупотребите с формите — на основание нашия
                    легитимен интерес (чл. 6, ал. 1, б. „е&ldquo;).
                  </li>
                  <li>
                    За изпълнение на законови задължения — например счетоводни и данъчни по Закона за счетоводството и
                    Закона за данък върху добавената стойност (чл. 6, ал. 1, б. „в&ldquo;).
                  </li>
                </ul>
              ),
            },
            {
              id: "razdel-4",
              num: "4.",
              title: "Споделяне с трети страни",
              content: (
                <>
                  <p>
                    Не продаваме Вашите лични данни. Споделяме ги само доколкото е необходимо: с доставчиците, на които
                    разчита сайтът — хостинг (Vercel), база данни (Neon), имейли (Resend), съхранение на документи
                    (Amazon Web Services) и вход с Google; с участниците във вноса на Вашия автомобил — аукционната
                    къща или продавача, превозвачите и митническия агент; с нашия счетоводител; както и с държавни
                    органи, когато закон го изисква. Доставчиците на сайта обработват данните само по наши указания.
                  </p>
                  <p>
                    Тези доставчици са от САЩ или са част от американски групи, а при внос от САЩ, Канада и Република
                    Корея данни получават и участниците във вноса в тези държави. Предаваме данни извън ЕС само въз
                    основа на решение на Европейската комисия за адекватно ниво на защита (за Канада, за Република Корея
                    и за дружествата в САЩ, сертифицирани по Рамката за защита на данните между ЕС и САЩ), на
                    стандартни договорни клаузи, одобрени от Комисията, или когато предаването е необходимо за
                    изпълнението на договора с Вас (чл. 49, пар. 1, б. „б&ldquo; от GDPR). Копие от приложимите
                    гаранции можете да поискате на <EmailLink />.
                  </p>
                </>
              ),
            },
            {
              id: "razdel-5",
              num: "5.",
              title: "Колко време съхраняваме данните",
              content: (
                <p>
                  Съхраняваме личните Ви данни само толкова, колкото е необходимо за целите, за които са събрани.
                  Запитванията, заявките за Carfax, офертите от калкулатора и кореспонденцията по тях пазим до 12 месеца
                  след последния контакт, ако не сключим договор. Данните по договори, плащания и счетоводни документи
                  пазим за сроковете по чл. 12 от Закона за счетоводството (до 10 години) и до изтичане на петгодишната
                  давност по Закона за задълженията и договорите. Данните за профила Ви пазим, докато имате активен
                  профил при нас.
                </p>
              ),
            },
            {
              id: "razdel-6",
              num: "6.",
              title: "Вашите права",
              content: (
                <>
                  <p>Съгласно GDPR имате право на:</p>
                  <ul>
                    <li>достъп до Вашите лични данни и копие от тях;</li>
                    <li>коригиране на неточни данни;</li>
                    <li>изтриване („правото да бъдеш забравен&ldquo;);</li>
                    <li>ограничаване или възражение срещу обработването;</li>
                    <li>преносимост на данните;</li>
                    <li>оттегляне на съгласие по всяко време, когато обработването се основава на съгласие;</li>
                    <li>
                      жалба до Комисията за защита на личните данни (КЗЛД) — гр. София, бул. „Проф. Цветан Лазаров&ldquo;
                      № 2.
                    </li>
                  </ul>
                  <p>
                    За да упражните правата си, пишете ни на <EmailLink />.
                  </p>
                  <p>
                    Предоставянето на данните по договор е необходимо за сключването и изпълнението му: без тях не можем
                    да оформим вноса и регистрацията на автомобила. Данните във формите са доброволни, но без телефон или
                    имейл не можем да Ви отговорим. Не вземаме решения, основани единствено на автоматизирано
                    обработване, включително профилиране.
                  </p>
                </>
              ),
            },
            {
              id: "razdel-7",
              num: "7.",
              title: "Бисквитки",
              content: (
                <p>
                  Сайтът използва технически необходими бисквитки за основната си работа (включително за поддържане на
                  Вашата сесия при вход в профил). За всички бисквитки, включително картите на Google Maps, които се
                  зареждат едва след Ваше натискане, вижте{" "}
                  <Link href="/politika-za-biskvitki" className="underline underline-offset-3">
                    Политиката за бисквитки
                  </Link>
                  .
                </p>
              ),
            },
            {
              id: "razdel-8",
              num: "8.",
              title: "Промени в политиката",
              content: (
                <p>
                  Може да актуализираме тази политика периодично. Актуалната версия е винаги достъпна на тази страница, с
                  посочена дата на последна актуализация.
                </p>
              ),
            },
          ]}
        />
      </main>
      <SiteFooter />
    </>
  );
}
