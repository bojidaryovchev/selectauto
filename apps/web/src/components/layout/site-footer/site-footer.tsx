import type { ComponentType } from "react";
import Image from "next/image";
import Link from "next/link";
import { LinkButton } from "@/components/common";
import { BUSINESS, CONTACT, SOCIALS } from "@/constants";
import { FOOTER_INFO, FOOTER_LEGAL, FOOTER_NAV } from "@/data/navigation";
import {
  FacebookIcon,
  InstagramIcon,
  TiktokIcon,
  ViberIcon,
} from "@/components/icons";
import { InquiryButton } from "@/components/inquiry/inquiry-button";

/** Maps a social label to its glyph (icons live in `@/components/icons`). */
const SOCIAL_ICONS: Record<string, ComponentType<{ className?: string }>> = {
  Facebook: FacebookIcon,
  Instagram: InstagramIcon,
  TikTok: TiktokIcon,
  Viber: ViberIcon,
};

/** Footer — ported from the site's `sa-site-footer`. */
export function SiteFooter() {
  return (
    <footer className="relative overflow-hidden bg-[radial-gradient(circle_at_top_center,rgba(216,111,22,0.12),transparent_30%),linear-gradient(180deg,#0f1014_0%,#090a0d_100%)] pt-20 text-white">
      <div className="mx-auto w-[min(100%-28px,1280px)]">
        <div className="grid grid-cols-[1.3fr_0.8fr_0.8fr_0.9fr] gap-8.5 py-18 pb-10.5 max-[1100px]:grid-cols-2 max-[920px]:grid-cols-1 max-[920px]:py-14.5 max-[920px]:pb-8.5">
          {/* Brand */}
          <div>
            <Link href="/" className="inline-flex">
              <Image
                src="/logo.png"
                alt="SelectAuto"
                width={170}
                height={72}
                className="h-18 w-auto object-contain"
              />
            </Link>
            <p className="my-4.5 mb-5.5 max-w-110 text-base leading-[1.8] text-white/70">
              Специализирани сме във внос на автомобили от Корея, САЩ и Канада —
              от правилен подбор и проверка, до логистика, съдействие и финално
              предаване на автомобила.
            </p>
            <div className="mb-5 grid gap-2">
              <a
                href={CONTACT.phoneHref}
                className="text-lg font-extrabold text-white"
              >
                {CONTACT.phone}
              </a>
              <a
                href={CONTACT.emailHref}
                className="text-lg font-extrabold text-white"
              >
                {CONTACT.email}
              </a>
            </div>
            <div className="flex flex-wrap gap-3">
              {SOCIALS.map((s) => {
                const Icon = SOCIAL_ICONS[s.label];
                return (
                  <LinkButton
                    key={s.label}
                    href={s.href}
                    aria-label={s.label}
                    rippleTheme="light"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex size-11 items-center justify-center rounded-[14px] border border-white/12 bg-white/4 text-white transition-all duration-200 hover:-translate-y-0.5 hover:border-brand/55 hover:bg-brand/12"
                  >
                    {Icon && <Icon className="block size-4.75" />}
                  </LinkButton>
                );
              })}
            </div>
          </div>

          {/* Навигация */}
          <div>
            <h3 className="mb-4.5 mt-2 text-[22px] font-black text-white">
              Навигация
            </h3>
            <ul className="m-0 grid list-none gap-3 p-0">
              {FOOTER_NAV.map((l) => (
                <li key={l.label}>
                  <Link
                    href={l.href}
                    className="inline-block text-base text-white/70 transition-all duration-200 hover:translate-x-0.5 hover:text-white"
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Информация */}
          <div>
            <h3 className="mb-4.5 mt-2 text-[22px] font-black text-white">
              Информация
            </h3>
            <ul className="m-0 grid list-none gap-3 p-0">
              {FOOTER_INFO.map((l) => (
                <li key={l.label}>
                  <Link
                    href={l.href}
                    className="inline-block text-base text-white/70 transition-all duration-200 hover:translate-x-0.5 hover:text-white"
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Бърз контакт */}
          <div>
            <h3 className="mb-4.5 mt-2 text-[22px] font-black text-white">
              Бърз контакт
            </h3>
            <div className="rounded-[20px] border border-white/8 bg-white/4 p-5.5 shadow-card">
              <p className="mb-4 leading-[1.75] text-white/70">
                Имаш въпрос за автомобил, доставка или аукцион?
              </p>
              <InquiryButton
                rippleTheme="light"
                className="inline-flex min-h-13.5 w-full items-center justify-center rounded-full bg-linear-to-r from-brand-dark to-brand px-6 text-[15px] font-extrabold text-white shadow-[0_12px_28px_rgba(216,111,22,0.22)] transition-transform duration-200 hover:-translate-y-0.5"
              >
                Запитване
              </InquiryButton>
            </div>
          </div>
        </div>

        <div className="border-t border-white/8">
          <div className="flex items-center justify-between gap-x-5 gap-y-3 py-4.5 pb-5.5 max-[920px]:flex-col max-[920px]:items-start">
            <p className="m-0 text-sm text-white/[0.58]">
              © 2026 SelectAuto. Всички права запазени.
            </p>
            {/* Legal / policy links — conventional bottom-bar placement (trust
                signal). Data in FOOTER_LEGAL. */}
            <nav aria-label="Правна информация">
              <ul className="m-0 flex flex-wrap items-center gap-x-5 gap-y-2 p-0">
                {FOOTER_LEGAL.map((l) => (
                  <li key={l.label}>
                    <Link
                      href={l.href}
                      className="text-sm text-white/[0.58] transition-colors duration-200 hover:text-white"
                    >
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          </div>

          {/* Provider identification (ЗЕТ чл. 4): пълно наименование, ЕИК, ДДС,
              седалище. Renders ONLY once the real entity data is filled into
              BUSINESS (registeredName/companyId) — nothing fake shows while blank. */}
          {BUSINESS.companyId && (
            <p className="m-0 border-t border-white/8 py-4 text-xs/relaxed text-white/40">
              {BUSINESS.registeredName || "SelectAuto"} · ЕИК {BUSINESS.companyId}
              {BUSINESS.vatId ? ` · ДДС № ${BUSINESS.vatId}` : ""} · Седалище:{" "}
              {BUSINESS.registeredOffice.streetAddress}, {BUSINESS.registeredOffice.postalCode}{" "}
              {BUSINESS.registeredOffice.city}, България
            </p>
          )}
        </div>
      </div>
    </footer>
  );
}
