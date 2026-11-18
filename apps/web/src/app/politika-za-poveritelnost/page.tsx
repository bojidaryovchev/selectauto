import type { Metadata } from "next";
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

/**
 * /politika-za-poveritelnost — privacy policy. Previously a dead footer link
 * (`FOOTER_INFO` pointed here with no route). Real, GDPR-aware content (the
 * business is EU-based and collects personal data via the inquiry/carfax forms
 * and user accounts), so it's substantive and indexable (low priority — see
 * sitemap). Static; NAP from `@/constants`.
 *
 * Look: board `in-privacy` (components/legal; parity check docs/design/parity/legal.md). The text is word for word
 * (owner decision 25).
 */
export default function PrivacyPolicyPage() {
  return (
    <>
      <SiteHeader />
      <main className="in-legal-pg flex-1 pt-(--header-h)">
        <LegalDocument
          title="Политика за поверителност"
          updated="Последна актуализация: юни 2026 г."
          sections={[
            {
              id: "razdel-1",
              num: "1.",
              title: "Кои сме ние (Администратор на данни)",
              content: (
                <p>
                  {SITE_NAME} обработва Вашите лични данни като администратор по смисъла на Регламент (ЕС)
                  2016/679 (GDPR). Можете да се свържете с нас на адрес {BUSINESS.streetAddress}, {BUSINESS.city},
                  България, на телефон {CONTACT.phone} или на имейл{" "}
                  <a href={CONTACT.emailHref} className="underline underline-offset-3">
                    {CONTACT.email}
                  </a>
                  .
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
                    <strong>Данни за профил</strong> — при регистрация: имейл и (за вход с парола) защитен с хеширане
                    пароловен запис; при вход с Google — основни профилни данни, предоставени от Google.
                  </li>
                  <li>
                    <strong>Технически данни</strong> — IP адрес, тип браузър и подобни данни, събирани автоматично при
                    използване на сайта.
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
                    За да отговорим на Вашите запитвания и да предоставим услугите по внос на автомобил — на основание
                    предприемане на стъпки по Ваше искане преди сключване на договор (чл. 6, ал. 1, б. „б&ldquo;).
                  </li>
                  <li>
                    За създаване и управление на потребителски профил и списък с любими — на основание изпълнение на
                    услугата, която заявявате.
                  </li>
                  <li>
                    За поддръжка, сигурност и подобряване на сайта — на основание нашия легитимен интерес (чл. 6, ал. 1,
                    б. „е&ldquo;).
                  </li>
                  <li>За изпълнение на законови задължения, когато такива са приложими (чл. 6, ал. 1, б. „в&ldquo;).</li>
                </ul>
              ),
            },
            {
              id: "razdel-4",
              num: "4.",
              title: "Споделяне с трети страни",
              content: (
                <p>
                  Не продаваме Вашите лични данни. Споделяме данни само с доставчици, които ни помагат да предоставим
                  услугата — например за изпращане на имейли, хостинг и (по Ваша заявка) проверка на история на
                  автомобил (Carfax) и аукционни партньори. Тези доставчици обработват данните само по наши указания.
                </p>
              ),
            },
            {
              id: "razdel-5",
              num: "5.",
              title: "Колко време съхраняваме данните",
              content: (
                <p>
                  Съхраняваме личните Ви данни само толкова, колкото е необходимо за целите, за които са събрани, или
                  докато имате активен профил при нас, освен ако закон не изисква по-дълъг срок.
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
                    За да упражните правата си, пишете ни на{" "}
                    <a href={CONTACT.emailHref} className="underline underline-offset-3">
                      {CONTACT.email}
                    </a>
                    .
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
                  Вашата сесия при вход в профил). Можете да управлявате бисквитките през настройките на браузъра си.
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
