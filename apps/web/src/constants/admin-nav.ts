import { LEAD_TYPE_META } from "@/constants/admin";

/**
 * The back-office navigation: one config, two renderers — the desktop sidebar
 * and the mobile drawer (components/admin/shell). Items carry an icon KEY rather
 * than a component: the list is built on the server, where the signed-in role
 * is known, and handed to client components, and functions can't cross that
 * boundary. The client maps the key to its glyph (admin-nav-icon.tsx).
 */
export type AdminNavIconName =
  | "dashboard"
  | "mail"
  | "carfax"
  | "inquiry"
  | "offer"
  | "contracts"
  | "deposits"
  | "mobilebg"
  | "hidden"
  | "tariffs"
  | "recipients"
  | "users"
  | "log";

export type AdminNavItem = { href: string; label: string; icon: AdminNavIconName };

/** A titled block of links; the first block (the dashboard) has no title. */
export type AdminNavGroup = { label: string | null; items: AdminNavItem[] };

const CONTRACTS: AdminNavItem = { href: "/admin/dogovori", label: "Договори", icon: "contracts" };
const DEPOSITS: AdminNavItem = { href: "/admin/depoziti", label: "Депозити", icon: "deposits" };
const MOBILEBG: AdminNavItem = { href: "/admin/mobile-bg", label: "mobile.bg", icon: "mobilebg" };

/**
 * The sections a user is shown. An admin sees everything; anyone else with
 * back-office access sees contracts and deposits, plus mobile.bg with
 * `mobilebg.publish`. Hiding a link is not the access control — every page
 * checks its own gate.
 */
export function adminNavGroups({
  isAdmin,
  canPublishMobilebg,
}: {
  isAdmin: boolean;
  canPublishMobilebg: boolean;
}): AdminNavGroup[] {
  const deals: AdminNavGroup = { label: "Сделки", items: [CONTRACTS, DEPOSITS] };
  if (!isAdmin) {
    return canPublishMobilebg ? [deals, { label: "Обяви", items: [MOBILEBG] }] : [deals];
  }
  return [
    { label: null, items: [{ href: "/admin", label: "Табло", icon: "dashboard" }] },
    {
      label: "Входящи",
      items: [
        { href: "/admin/poshta", label: "Поща", icon: "mail" },
        { href: LEAD_TYPE_META.carfax.href, label: LEAD_TYPE_META.carfax.short, icon: "carfax" },
        { href: LEAD_TYPE_META.inquiry.href, label: LEAD_TYPE_META.inquiry.short, icon: "inquiry" },
        { href: LEAD_TYPE_META.calculator.href, label: LEAD_TYPE_META.calculator.short, icon: "offer" },
      ],
    },
    deals,
    {
      label: "Обяви",
      items: [
        ...(canPublishMobilebg ? [MOBILEBG] : []),
        { href: "/admin/skriti-obyavi", label: "Скрити обяви", icon: "hidden" },
      ],
    },
    {
      label: "Настройки",
      items: [
        { href: "/admin/tarifi", label: "Тарифи", icon: "tariffs" },
        { href: "/admin/poluchateli", label: "Получатели", icon: "recipients" },
        { href: "/admin/potrebiteli", label: "Потребители", icon: "users" },
      ],
    },
    { label: "Контрол", items: [{ href: "/admin/dnevnik", label: "Дневник", icon: "log" }] },
  ];
}

/** Where the brand link goes: the dashboard is admin-only, so others land on the contracts. */
export function adminHomeHref(isAdmin: boolean): string {
  return isAdmin ? "/admin" : "/admin/dogovori";
}

/**
 * Whether `href` is the section the user is in. Whole path segments only, so a
 * future `/admin/dogovori-x` can't light up „Договори"; `/admin` itself matches
 * only the dashboard, not every admin page.
 */
export function isAdminNavActive(pathname: string, href: string): boolean {
  if (href === "/admin") return pathname === "/admin";
  return pathname === href || pathname.startsWith(`${href}/`);
}
