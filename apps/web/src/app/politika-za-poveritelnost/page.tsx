import type { Metadata } from "next";
import { Container } from "@/components/common";
import { SiteFooter, SiteHeader } from "@/components/layout";
import { BUSINESS, CONTACT, SITE_NAME, SITE_URL } from "@/constants";

export const metadata: Metadata = {
  title: "Политика за поверителност | SelectAuto",
  description:
    "Как SelectAuto събира, използва и защитава личните ви данни — съгласно Регламент (ЕС) 2016/679 (GDPR). Какви данни обработваме, на какво основание, за колко време и какви са вашите права.",
  alternates: { canonical: `${SITE_URL}/politika-za-poveritelnost` },
};

/**
 * /politika-za-poveritelnost — privacy policy. Previously a dead footer link
 * (`FOOTER_INFO` pointed here with no route). Real, GDPR-aware content (the
 * business is EU-based and collects personal data via the inquiry/carfax forms
 * and user accounts), so it's substantive and indexable (low priority — see
 * sitemap). Static; NAP from `@/constants`.
 */
export default function PrivacyPolicyPage() {
  return (
    <>
      <SiteHeader />
      <main className="flex-1 bg-[#fafafa] pt-(--header-h) text-ink">
        <Container className="max-w-215 py-12 max-md:py-8">
          <h1 className="mb-3 text-4xl font-black uppercase tracking-tight text-ink max-md:text-3xl">
            Политика за поверителност
          </h1>
          <p className="mb-10 text-sm text-muted">Последна актуализация: юни 2026 г.</p>

          <div className="flex flex-col gap-8 text-[15px] leading-[1.8] text-[#3d4046]">
            <section>
              <h2 className="mb-2 text-xl font-extrabold text-ink">1. Кои сме ние (Администратор на данни)</h2>
              <p>
                {SITE_NAME} обработва Вашите лични данни като администратор по смисъла на Регламент (ЕС)
                2016/679 (GDPR). Можете да се свържете с нас на адрес {BUSINESS.streetAddress}, {BUSINESS.city},
                България, на телефон {CONTACT.phone} или на имейл{" "}
                <a href={CONTACT.emailHref} className="font-semibold text-brand-dark hover:underline">
                  {CONTACT.email}
                </a>
                .
              </p>
            </section>

            <section>
              <h2 className="mb-2 text-xl font-extrabold text-ink">2. Какви данни събираме</h2>
              <ul className="ml-5 list-disc space-y-1.5">
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
            </section>

            <section>
              <h2 className="mb-2 text-xl font-extrabold text-ink">3. За какво използваме данните и на какво основание</h2>
              <ul className="ml-5 list-disc space-y-1.5">
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
            </section>

            <section>
              <h2 className="mb-2 text-xl font-extrabold text-ink">4. Споделяне с трети страни</h2>
              <p>
                Не продаваме Вашите лични данни. Споделяме данни само с доставчици, които ни помагат да предоставим
                услугата — например за изпращане на имейли, хостинг и (по Ваша заявка) проверка на история на
                автомобил (Carfax) и аукционни партньори. Тези доставчици обработват данните само по наши указания.
              </p>
            </section>

            <section>
              <h2 className="mb-2 text-xl font-extrabold text-ink">5. Колко време съхраняваме данните</h2>
              <p>
                Съхраняваме личните Ви данни само толкова, колкото е необходимо за целите, за които са събрани, или
                докато имате активен профил при нас, освен ако закон не изисква по-дълъг срок.
              </p>
            </section>

            <section>
              <h2 className="mb-2 text-xl font-extrabold text-ink">6. Вашите права</h2>
              <p className="mb-2">Съгласно GDPR имате право на:</p>
              <ul className="ml-5 list-disc space-y-1.5">
                <li>достъп до Вашите лични данни и копие от тях;</li>
                <li>коригиране на неточни данни;</li>
                <li>изтриване („правото да бъдеш забравен&ldquo;);</li>
                <li>ограничаване или възражение срещу обработването;</li>
                <li>преносимост на данните;</li>
                <li>оттегляне на съгласие по всяко време, когато обработването се основава на съгласие;</li>
                <li>
                  жалба до Комисията за защита на личните данни (КЗЛД) — гр. София, бул. „Проф. Цветан Лазаров&ldquo; № 2.
                </li>
              </ul>
              <p className="mt-2">
                За да упражните правата си, пишете ни на{" "}
                <a href={CONTACT.emailHref} className="font-semibold text-brand-dark hover:underline">
                  {CONTACT.email}
                </a>
                .
              </p>
            </section>

            <section>
              <h2 className="mb-2 text-xl font-extrabold text-ink">7. Бисквитки</h2>
              <p>
                Сайтът използва технически необходими бисквитки за основната си работа (включително за поддържане на
                Вашата сесия при вход в профил). Можете да управлявате бисквитките през настройките на браузъра си.
              </p>
            </section>

            <section>
              <h2 className="mb-2 text-xl font-extrabold text-ink">8. Промени в политиката</h2>
              <p>
                Може да актуализираме тази политика периодично. Актуалната версия е винаги достъпна на тази страница, с
                посочена дата на последна актуализация.
              </p>
            </section>
          </div>
        </Container>
      </main>
      <SiteFooter />
    </>
  );
}
