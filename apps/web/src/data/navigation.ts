import type { LinkItem, NavItem } from "@/types/nav.type";

/**
 * Primary site navigation (desktop + mobile drawer).
 *
 * Kept to 5 top-level items so the desktop bar breathes at 1024–1400px and leaves
 * room for a language switcher in the right-hand action cluster. This costs no SEO:
 * the desktop <nav> is only CSS-hidden below lg (still in the DOM) and the mobile
 * drawer renders this same NAV server-side, so crawlers follow every link —
 * including the nested country hubs — at every breakpoint (docs/12-web-seo-strategy.md §7).
 * Nesting the hubs under a dropdown keeps them site-wide-linked at crawl-depth 1
 * with their keyword-rich „Внос от …" anchors intact, so internal equity is ~equal
 * to a flat bar; the choice is driven by UX, not ranking.
 *
 * „Начало" is deliberately NOT a nav item: the header logo links home (universal
 * convention) and the mobile bottom nav has a permanent Home tab, so an explicit
 * entry would be redundant. Dropping it frees the slot that lets BOTH „Автомобили"
 * (browse) and „Внос" (the import service / money pages) stay top-level and
 * distinct — the two concepts this business must surface — instead of one burying
 * the other.
 *
 * Grouping:
 *  - „Автомобили" → the catalog (highest-traffic page gets the direct top-level link).
 *  - „Внос" → the per-market country hubs (flagship lead-gen pages). Parent → Korea
 *    flagship, so every page throws a site-wide „Внос" anchor at the #1 money page.
 *  - „Инструменти" groups the interactive tools — calculator + VIN + Carfax.
 *  - „За нас" groups the E-E-A-T / authority cluster (about, process, reviews, FAQ).
 *
 * „Любими" is intentionally absent — a noindex personal page reached via the
 * account menu (UserMenu) and the mobile drawer, not a prime top-level slot.
 */
export const NAV: NavItem[] = [
  { label: "Автомобили", href: "/vsichki-avtomobili/" },
  {
    label: "Внос",
    href: "/vnos-na-koli-ot-korea/",
    children: [
      { label: "Внос от Корея", href: "/vnos-na-koli-ot-korea/" },
      { label: "Внос от САЩ", href: "/vnos-na-koli-ot-sasht/" },
      { label: "Внос от Канада", href: "/vnos-na-koli-ot-kanada/" },
    ],
  },
  {
    label: "Инструменти",
    href: "/kalkulator/",
    children: [
      { label: "Калкулатор за внос", href: "/kalkulator/" },
      { label: "Лизингов калкулатор", href: "/lizingov-kalkulator/" },
      { label: "Бюджетен калкулатор", href: "/byudzheten-kalkulator/" },
      { label: "Проверка на VIN", href: "/proverka-vin/" },
      { label: "Carfax проверка", href: "/carfax/" },
    ],
  },
  {
    label: "За нас",
    href: "/za-nas/",
    children: [
      { label: "За нас", href: "/za-nas/" },
      { label: "Процес", href: "/proces/" },
      { label: "Отзиви", href: "/otzivi/" },
      { label: "Често задавани въпроси", href: "/chesto-zadavani-vaprosi/" },
    ],
  },
  { label: "Контакти", href: "/kontakti/" },
];

/** Footer "Навигация" column — mirrors the header's transactional surface so the
 *  country hubs get a second site-wide link (docs/12-web-seo-strategy.md §7). */
export const FOOTER_NAV: LinkItem[] = [
  { label: "Начало", href: "/" },
  { label: "Автомобили", href: "/vsichki-avtomobili/" },
  { label: "Внос от Корея", href: "/vnos-na-koli-ot-korea/" },
  { label: "Внос от САЩ", href: "/vnos-na-koli-ot-sasht/" },
  { label: "Внос от Канада", href: "/vnos-na-koli-ot-kanada/" },
  { label: "За нас", href: "/za-nas/" },
  { label: "Контакти", href: "/kontakti/" },
];

/** Footer "Информация" column — tools + trust/authority pages. (Legal docs live
 *  in FOOTER_LEGAL, rendered as a separate row in the footer's bottom bar.) */
export const FOOTER_INFO: LinkItem[] = [
  { label: "Калкулатор за внос", href: "/kalkulator/" },
  { label: "Лизингов калкулатор", href: "/lizingov-kalkulator/" },
  { label: "Бюджетен калкулатор", href: "/byudzheten-kalkulator/" },
  { label: "Проверка на VIN", href: "/proverka-vin/" },
  { label: "Carfax проверка", href: "/carfax/" },
  { label: "Процес", href: "/proces/" },
  { label: "Отзиви", href: "/otzivi/" },
  { label: "Често задавани въпроси", href: "/chesto-zadavani-vaprosi/" },
];

/**
 * Legal / policy documents — rendered as a small link row in the footer's bottom
 * bar next to the copyright (the conventional, trust-signalling placement), NOT in
 * the content columns. Privacy is live; Общи условия + бисквитки are required for a
 * BG service business (ЗЕТ + ЗЗП + ePrivacy) — see the pages for the legal basis.
 */
export const FOOTER_LEGAL: LinkItem[] = [
  { label: "Общи условия", href: "/obshti-usloviya/" },
  { label: "Политика за поверителност", href: "/politika-za-poveritelnost/" },
  { label: "Политика за бисквитки", href: "/politika-za-biskvitki/" },
];
