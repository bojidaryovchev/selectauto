import type { ComponentType } from "react";
import Link from "next/link";
import { Logo } from "@/components/common";
import { BUSINESS, CONTACT, SOCIALS } from "@/constants";
import { FOOTER_INFO, FOOTER_LEGAL, FOOTER_NAV } from "@/data/navigation";
import { FacebookIcon, InstagramIcon, TiktokIcon, ViberIcon } from "@/components/icons";
import { InquiryButton } from "@/components/inquiry/inquiry-button";

/** Maps a social label to its glyph (icons live in `@/components/icons`). */
const SOCIAL_ICONS: Record<string, ComponentType<{ className?: string }>> = {
  Facebook: FacebookIcon,
  Instagram: InstagramIcon,
  TikTok: TiktokIcon,
  Viber: ViberIcon,
};

/**
 * The site footer (the kit's footer partial; parity check docs/design/parity/shell.md): the logo, who we are, phone
 * and e-mail, the social links, the Навигация and Информация columns, a quick-contact panel with „Запитване", the
 * copyright with the legal links, and the company line the e-commerce act asks for.
 */
export function SiteFooter() {
  return (
    // Night in both themes: the gold logo sits on dark grounds only (styles/tokens.css, light mode).
    <footer className="sa-ftr" data-theme="dark">
      <div className="sa-wrap">
        <div className="sa-ftr__g">
          <div>
            <Link href="/" className="sa-ftr__logo inline-flex">
              <Logo size="footer" />
            </Link>
            <p className="sa-ftr__about">
              Специализирани сме във внос на автомобили от Корея, САЩ и Канада — от правилен подбор и проверка, до
              логистика, съдействие и финално предаване на автомобила.
            </p>
            <div className="sa-ftr__ct">
              <a href={CONTACT.phoneHref}>{CONTACT.phone}</a>
              <a href={CONTACT.emailHref}>{CONTACT.email}</a>
            </div>
            <div className="sa-ftr__soc">
              {SOCIALS.map((s) => {
                const Icon = SOCIAL_ICONS[s.label];
                return (
                  <a key={s.label} href={s.href} aria-label={s.label} target="_blank" rel="noopener noreferrer">
                    {Icon ? <Icon /> : null}
                  </a>
                );
              })}
            </div>
          </div>

          <nav aria-label="Навигация">
            <h3>Навигация</h3>
            <div className="sa-ftr__l">
              {FOOTER_NAV.map((l) => (
                <Link key={l.label} href={l.href}>
                  {l.label}
                </Link>
              ))}
            </div>
          </nav>

          <nav aria-label="Информация">
            <h3>Информация</h3>
            <div className="sa-ftr__l">
              {FOOTER_INFO.map((l) => (
                <Link key={l.label} href={l.href}>
                  {l.label}
                </Link>
              ))}
            </div>
          </nav>

          <div>
            <h3>Бърз контакт</h3>
            <div className="sa-pnl sa-stack">
              <p className="sa-p">Имате въпрос за автомобил, доставка или аукцион?</p>
              <InquiryButton variant="pri" block>
                Запитване
              </InquiryButton>
            </div>
          </div>
        </div>

        <div className="sa-ftr__bar">
          <p>© 2026 SelectAuto. Всички права запазени.</p>
          <nav aria-label="Правна информация">
            {FOOTER_LEGAL.map((l) => (
              <Link key={l.label} href={l.href}>
                {l.label}
              </Link>
            ))}
          </nav>
        </div>

        {/* Provider identification (ЗЕТ чл. 4): full name, ЕИК, ДДС, seat. Rendered only once the real entity data is
            in BUSINESS, so nothing fake shows while it's blank. */}
        {BUSINESS.companyId && (
          <p className="sa-ftr__id">
            {BUSINESS.registeredName || "SelectAuto"} · ЕИК {BUSINESS.companyId}
            {BUSINESS.vatId ? ` · ДДС № ${BUSINESS.vatId}` : ""} · Седалище:{" "}
            {BUSINESS.registeredOffice.streetAddress}, {BUSINESS.registeredOffice.postalCode}{" "}
            {BUSINESS.registeredOffice.city}, България
          </p>
        )}
      </div>
    </footer>
  );
}
