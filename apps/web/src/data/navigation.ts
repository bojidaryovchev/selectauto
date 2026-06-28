import type { LinkItem, NavItem } from "@/types/nav.type";

/** Primary site navigation (desktop + mobile drawer). */
export const NAV: NavItem[] = [
  { label: "Начало", href: "/" },
  {
    label: "Автомобили",
    href: "/vsichki-avtomobili/",
    children: [
      { label: "Всички автомобили", href: "/vsichki-avtomobili/" },
      { label: "Корея", href: "/коли-за-продажба/" },
      { label: "САЩ и Канада", href: "/внос/" },
    ],
  },
  { label: "Процес", href: "/proces/" },
  { label: "Carfax", href: "/carfax/" },
  { label: "За нас", href: "/за-нас/" },
  { label: "Контакти", href: "/kontakti/" },
];

/** Footer "Навигация" column. */
export const FOOTER_NAV: LinkItem[] = [
  { label: "Начало", href: "/" },
  { label: "Автомобили", href: "/vsichki-avtomobili/" },
  { label: "Carfax", href: "/carfax/" },
  { label: "За нас", href: "/за-нас/" },
  { label: "Контакти", href: "/kontakti/" },
];

/** Footer "Информация" column. */
export const FOOTER_INFO: LinkItem[] = [
  { label: "За нас", href: "/за-нас/" },
  { label: "Процес", href: "/proces/" },
  { label: "Контакти", href: "/kontakti/" },
  { label: "Политика за поверителност", href: "/privacy-policy/" },
  { label: "Финансов калкулатор", href: "/калкулатор/" },
];
