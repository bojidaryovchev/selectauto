import type { LinkItem, NavItem } from "@/types/nav.type";

/** Primary site navigation (desktop + mobile drawer). */
export const NAV: NavItem[] = [
  { label: "Начало", href: "/" },
  // Single catalog page now — no dropdown. (The old Корея / САЩ и Канада
  // sub-links were legacy section pages; the all-cars page covers both via its
  // market filter.)
  { label: "Автомобили", href: "/vsichki-avtomobili/" },
  { label: "Процес", href: "/proces/" },
  { label: "Carfax", href: "/carfax/" },
  { label: "За нас", href: "/za-nas/" },
  { label: "Контакти", href: "/kontakti/" },
];

/** Footer "Навигация" column. */
export const FOOTER_NAV: LinkItem[] = [
  { label: "Начало", href: "/" },
  { label: "Автомобили", href: "/vsichki-avtomobili/" },
  { label: "Carfax", href: "/carfax/" },
  { label: "За нас", href: "/za-nas/" },
  { label: "Контакти", href: "/kontakti/" },
];

/** Footer "Информация" column. */
export const FOOTER_INFO: LinkItem[] = [
  { label: "За нас", href: "/za-nas/" },
  { label: "Процес", href: "/proces/" },
  { label: "Контакти", href: "/kontakti/" },
  { label: "Политика за поверителност", href: "/politika-za-poveritelnost/" },
  { label: "Финансов калкулатор", href: "/kalkulator/" },
];
