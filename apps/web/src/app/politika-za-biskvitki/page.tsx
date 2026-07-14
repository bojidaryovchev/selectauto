import type { Metadata } from "next";
import Link from "next/link";
import { Container } from "@/components/common";
import { SiteFooter, SiteHeader } from "@/components/layout";
import { CONTACT, SITE_NAME, SITE_URL } from "@/constants";

export const metadata: Metadata = {
  title: "Политика за бисквитки | SelectAuto",
  description:
    "Как SelectAuto използва бисквитки — технически необходими бисквитки за работата на сайта и бисквитки от трети страни (Google Maps). Как да управлявате съгласието и настройките на браузъра си.",
  alternates: { canonical: `${SITE_URL}/politika-za-biskvitki` },
};

/**
 * /politika-za-biskvitki — standalone Cookie Policy (previously only a §7 blurb in
 * the privacy page). Required under the ePrivacy Directive Art. 5(3) → Закона за
 * електронните съобщения: consent for non-essential cookies.
 *
 * Accurately scoped to what the site actually sets TODAY (verified in code):
 *  - technically-necessary auth/session cookies (Auth.js JWT) — no consent needed;
 *  - a Google Maps <iframe> on /kontakti (components/contacts/contact-map.tsx) —
 *    third-party cookies that DO require consent.
 *
 * ⚠️ FOLLOW-UP: the Maps embed currently loads unconditionally. To be fully
 * consent-compliant it should be gated behind a cookie-consent choice (or a
 * click-to-load placeholder), and any future analytics/pixel MUST be added behind
 * a consent banner. Keep this page in sync with what actually ships.
 *
 * Static.
 */
export default function CookiePolicyPage() {
  return (
    <>
      <SiteHeader />
      <main className="flex-1 bg-[#fafafa] pt-(--header-h) text-ink">
        <Container className="max-w-215 py-12 max-md:py-8">
          <h1 className="mb-3 text-4xl font-black uppercase tracking-tight text-ink max-md:text-3xl">
            Политика за бисквитки
          </h1>
          <p className="mb-10 text-sm text-muted">Последна актуализация: юли 2026 г.</p>

          <div className="flex flex-col gap-8 text-[15px] leading-[1.8] text-[#3d4046]">
            <section>
              <h2 className="mb-2 text-xl font-extrabold text-ink">1. Какво са бисквитките</h2>
              <p>
                Бисквитките (cookies) са малки текстови файлове, които се съхраняват на Вашето устройство, когато
                посещавате уебсайт. Те помагат сайтът да функционира, да запомня Вашата сесия и да работи по-удобно.
                {" "}
                {SITE_NAME} използва бисквитки съгласно приложимото законодателство (Закона за електронните съобщения и
                GDPR).
              </p>
            </section>

            <section>
              <h2 className="mb-2 text-xl font-extrabold text-ink">2. Какви бисквитки използваме</h2>
              <h3 className="mb-1 mt-2 text-base font-extrabold text-ink">Технически необходими</h3>
              <p className="mb-3">
                Използваме бисквитки, които са строго необходими за основната работа на сайта — включително за
                поддържане на Вашата сесия при вход в потребителски профил (сигурен, подписан идентификатор на сесията).
                Тези бисквитки не изискват съгласие, тъй като без тях сайтът не може да предостави заявената услуга.
              </p>
              <h3 className="mb-1 mt-2 text-base font-extrabold text-ink">От трети страни</h3>
              <p>
                На страницата{" "}
                <Link href="/kontakti/" className="font-semibold text-brand-dark hover:underline">
                  Контакти
                </Link>{" "}
                зареждаме вградена карта на Google Maps, за да покажем локацията на шоурума. Google може да постави
                собствени бисквитки при зареждане на картата. Тези бисквитки се управляват от Google съгласно неговата
                политика за поверителност. Ако не желаете такива бисквитки, можете да не отваряте картата и да
                управлявате настройките през браузъра си.
              </p>
            </section>

            <section>
              <h2 className="mb-2 text-xl font-extrabold text-ink">3. Управление на бисквитките</h2>
              <p>
                Можете по всяко време да изтривате и блокирате бисквитки през настройките на браузъра си (обикновено в
                раздел „Поверителност&ldquo; или „Настройки на сайтовете&ldquo;). Имайте предвид, че блокирането на
                технически необходимите бисквитки може да наруши работата на някои функции — например вход в профил.
              </p>
            </section>

            <section>
              <h2 className="mb-2 text-xl font-extrabold text-ink">4. Връзка с личните данни</h2>
              <p>
                Повече за това как обработваме лични данни ще намерите в нашата{" "}
                <Link href="/politika-za-poveritelnost/" className="font-semibold text-brand-dark hover:underline">
                  Политика за поверителност
                </Link>
                . За въпроси относно бисквитките пишете ни на{" "}
                <a href={CONTACT.emailHref} className="font-semibold text-brand-dark hover:underline">
                  {CONTACT.email}
                </a>
                .
              </p>
            </section>

            <section>
              <h2 className="mb-2 text-xl font-extrabold text-ink">5. Промени</h2>
              <p>
                Може да актуализираме тази политика при промяна в използваните бисквитки. Актуалната версия е винаги
                достъпна на тази страница, с посочена дата на последна актуализация.
              </p>
            </section>
          </div>
        </Container>
      </main>
      <SiteFooter />
    </>
  );
}
