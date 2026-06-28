import type { ComponentType } from "react";
import Image from "next/image";
import Link from "next/link";
import { CONTACT, SOCIALS } from "@/constants";
import { FOOTER_INFO, FOOTER_NAV } from "@/data/navigation";
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
    <footer className="relative mt-20 overflow-hidden bg-[radial-gradient(circle_at_top_center,rgba(216,111,22,0.12),transparent_30%),linear-gradient(180deg,#0f1014_0%,#090a0d_100%)] text-white">
      <div className="mx-auto w-[min(100%-28px,1280px)]">
        <div className="grid grid-cols-[1.3fr_0.8fr_0.8fr_0.9fr] gap-[34px] py-[72px] pb-[42px] max-[1100px]:grid-cols-2 max-[920px]:grid-cols-1 max-[920px]:py-[58px] max-[920px]:pb-[34px]">
          {/* Brand */}
          <div>
            <Link href="/" className="inline-flex">
              <Image
                src="/logo.png"
                alt="SelectAuto"
                width={170}
                height={72}
                className="h-[72px] w-auto object-contain"
              />
            </Link>
            <p className="my-[18px] mb-[22px] max-w-[440px] text-base leading-[1.8] text-white/70">
              Специализирани сме във внос на автомобили от Европа и САЩ — от
              правилен подбор и проверка, до логистика, съдействие и финално
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
                  <a
                    key={s.label}
                    href={s.href}
                    aria-label={s.label}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex h-11 w-11 items-center justify-center rounded-[14px] border border-white/[0.12] bg-white/[0.04] text-white transition-all duration-200 hover:-translate-y-0.5 hover:border-brand/55 hover:bg-brand/[0.12]"
                  >
                    {Icon && <Icon className="block h-[19px] w-[19px]" />}
                  </a>
                );
              })}
            </div>
          </div>

          {/* Навигация */}
          <div>
            <h3 className="mb-[18px] mt-2 text-[22px] font-black text-white">
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
            <h3 className="mb-[18px] mt-2 text-[22px] font-black text-white">
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
            <h3 className="mb-[18px] mt-2 text-[22px] font-black text-white">
              Бърз контакт
            </h3>
            <div className="rounded-[20px] border border-white/[0.08] bg-white/[0.04] p-[22px] shadow-card">
              <p className="mb-4 leading-[1.75] text-white/70">
                Имаш въпрос за автомобил, доставка или аукцион?
              </p>
              <InquiryButton className="inline-flex min-h-[54px] w-full items-center justify-center rounded-full bg-gradient-to-r from-brand-dark to-brand px-6 text-[15px] font-extrabold text-white shadow-[0_12px_28px_rgba(216,111,22,0.22)] transition-transform duration-200 hover:-translate-y-0.5">
                Запитване
              </InquiryButton>
            </div>
          </div>
        </div>

        <div className="border-t border-white/[0.08]">
          <div className="flex items-center justify-between gap-5 py-[18px] pb-[22px] max-[920px]:flex-col max-[920px]:items-start">
            <p className="m-0 text-sm text-white/[0.58]">
              © 2026 SelectAuto. Всички права запазени.
            </p>
            <p className="m-0 text-sm text-white/[0.58]">
              Изработка:{" "}
              <a
                href="https://webcore.bg/"
                className="text-[#7af4ff] transition-opacity duration-200 hover:opacity-75"
              >
                WebCore ltd.
              </a>
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
