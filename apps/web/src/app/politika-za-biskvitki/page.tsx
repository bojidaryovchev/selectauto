import type { Metadata } from "next";
import Link from "next/link";
import { LegalDocument } from "@/components/legal";
import { SiteFooter, SiteHeader } from "@/components/layout";
import { CONTACT, SITE_NAME, SITE_URL } from "@/constants";
import { buildSocialMeta } from "@/lib/social-meta";

const TITLE = "Политика за бисквитки | SelectAuto";
const DESCRIPTION =
  "Как SelectAuto използва бисквитки — технически необходими бисквитки за работата на сайта и бисквитки от трети страни (Google Maps). Как да управлявате съгласието и настройките на браузъра си.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: `${SITE_URL}/politika-za-biskvitki` },
  // Its own share URL: without this the page inherited the layout's, the home page.
  ...buildSocialMeta({ title: TITLE, description: DESCRIPTION, path: "/politika-za-biskvitki" }),
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
 * Static. Look: board `in-cookies` (components/legal; parity check docs/design/parity/legal.md). The text is word for
 * word (owner decision 25).
 */
export default function CookiePolicyPage() {
  return (
    <>
      <SiteHeader />
      <main className="in-legal-pg flex-1 pt-(--header-h)">
        <LegalDocument
          title="Политика за бисквитки"
          updated="Последна актуализация: юли 2026 г."
          sections={[
            {
              id: "razdel-1",
              num: "1.",
              title: "Какво са бисквитките",
              content: (
                <p>
                  Бисквитките (cookies) са малки текстови файлове, които се съхраняват на Вашето устройство, когато
                  посещавате уебсайт. Те помагат сайтът да функционира, да запомня Вашата сесия и да работи по-удобно.
                  {" "}
                  {SITE_NAME} използва бисквитки съгласно приложимото законодателство (Закона за електронните съобщения и
                  GDPR).
                </p>
              ),
            },
            {
              id: "razdel-2",
              num: "2.",
              title: "Какви бисквитки използваме",
              content: (
                <>
                  <h3>Технически необходими</h3>
                  <p>
                    Използваме бисквитки, които са строго необходими за основната работа на сайта — включително за
                    поддържане на Вашата сесия при вход в потребителски профил (сигурен, подписан идентификатор на
                    сесията). Тези бисквитки не изискват съгласие, тъй като без тях сайтът не може да предостави
                    заявената услуга.
                  </p>
                  <h3>От трети страни</h3>
                  <p>
                    На страницата{" "}
                    <Link href="/kontakti" className="underline underline-offset-3">
                      Контакти
                    </Link>{" "}
                    зареждаме вградена карта на Google Maps, за да покажем локацията на шоурума. Google може да постави
                    собствени бисквитки при зареждане на картата. Тези бисквитки се управляват от Google съгласно
                    неговата политика за поверителност. Ако не желаете такива бисквитки, можете да не отваряте картата и
                    да управлявате настройките през браузъра си.
                  </p>
                </>
              ),
            },
            {
              id: "razdel-3",
              num: "3.",
              title: "Управление на бисквитките",
              content: (
                <p>
                  Можете по всяко време да изтривате и блокирате бисквитки през настройките на браузъра си (обикновено в
                  раздел „Поверителност&ldquo; или „Настройки на сайтовете&ldquo;). Имайте предвид, че блокирането на
                  технически необходимите бисквитки може да наруши работата на някои функции — например вход в профил.
                </p>
              ),
            },
            {
              id: "razdel-4",
              num: "4.",
              title: "Връзка с личните данни",
              content: (
                <p>
                  Повече за това как обработваме лични данни ще намерите в нашата{" "}
                  <Link href="/politika-za-poveritelnost" className="underline underline-offset-3">
                    Политика за поверителност
                  </Link>
                  . За въпроси относно бисквитките пишете ни на{" "}
                  <a href={CONTACT.emailHref} className="underline underline-offset-3">
                    {CONTACT.email}
                  </a>
                  .
                </p>
              ),
            },
            {
              id: "razdel-5",
              num: "5.",
              title: "Промени",
              content: (
                <p>
                  Може да актуализираме тази политика при промяна в използваните бисквитки. Актуалната версия е винаги
                  достъпна на тази страница, с посочена дата на последна актуализация.
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
