"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CarIcon, GlobeIcon, HomeIcon, MenuIcon } from "@/components/icons";
import { useHasPainted } from "@/lib/after-first-paint";

/**
 * The bottom tab bar on phones and tablets (the kit hides it from 1024 px): Начало · Автомобили · Carfax, and Меню,
 * which toggles the drawer owned by `SiteHeader` (boards `ac-drawer`, `ac-drawer-tab`). The current tab is orange
 * with a line on top. It reserves the iOS home-indicator area, and hides with the top bar on scroll down.
 */
interface Props {
  /** Whether the drawer is open — the Меню tab is then marked and offers to close it. */
  drawerOpen: boolean;
  /** Slide the bar off-screen; driven by the same scroll-direction signal as the top bar. */
  hidden: boolean;
  /** Toggle the drawer (owned by SiteHeader so the drawer and this bar share state). */
  onToggleDrawer: () => void;
}

const TABS = [
  { label: "Начало", href: "/", Icon: HomeIcon, exact: true },
  { label: "Автомобили", href: "/vsichki-avtomobili", Icon: CarIcon, exact: false },
  { label: "Carfax", href: "/carfax", Icon: GlobeIcon, exact: false },
] as const;

export function MobileBottomNav({ drawerOpen, hidden, onToggleDrawer }: Props) {
  const pathname = usePathname();
  const painted = useHasPainted();

  // Normalise the path to a trailing slash to compare with the hrefs. Home matches exactly; the other tabs match
  // their sub-tree (e.g. /vsichki-avtomobili/... stays active).
  const current = pathname.endsWith("/") ? pathname : `${pathname}/`;
  const isActive = (href: string, exact: boolean) =>
    exact ? current === href : current === href || current.startsWith(href);

  return (
    <nav
      aria-label="Основна навигация"
      // Night in both themes, with the header (styles/tokens.css, light mode).
      data-theme="dark"
      className={`sa-bnav z-10000 h-[calc(var(--bottom-nav)+env(safe-area-inset-bottom))] pb-[env(safe-area-inset-bottom)] transition-transform duration-300 ease-out will-change-transform motion-reduce:transition-none ${
        hidden ? "translate-y-full" : "translate-y-0"
      }`}
    >
      {TABS.map(({ label, href, Icon, exact }) => (
        <Link
          key={label}
          href={href}
          prefetch={painted ? undefined : false}
          aria-current={isActive(href, exact) ? "page" : undefined}
        >
          <Icon />
          {label}
        </Link>
      ))}
      {/* Named by its visible word „Меню" (WCAG 2.5.3, label in name: a voice user says what they see); whether the
          drawer is open is announced through aria-expanded. */}
      <button
        type="button"
        onClick={onToggleDrawer}
        aria-expanded={drawerOpen}
        className={drawerOpen ? "is-on" : undefined}
      >
        <MenuIcon />
        Меню
      </button>
    </nav>
  );
}
