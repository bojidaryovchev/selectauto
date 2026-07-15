"use client";

import { usePathname } from "next/navigation";
import { Button, LinkButton } from "@/components/common";
import { CarIcon, GlobeIcon, HomeIcon } from "@/components/icons";
import { NavHamburger } from "./nav-hamburger";

/**
 * Fixed, app-style bottom tab bar for mobile (`lg:hidden`). Sits above the page
 * on a translucent, blurred dark shell and holds four equal tabs:
 *
 *   Начало (home) · Автомобили (car) · Carfax (globe) — direct `LinkButton`s
 *   Меню — a `Button` that toggles the slide-in drawer owned by `SiteHeader`.
 *
 * Every tab is a ripple-backed primitive (`LinkButton`/`Button`), so taps get a
 * Material ripple for free. The active tab (matched on the current pathname) is
 * tinted brand-orange; the rest stay muted grey.
 *
 * The bar reserves the iOS home-indicator area with `env(safe-area-inset-bottom)`
 * and publishes its own height would-be, but pages already end in a footer, so no
 * global offset token is needed here (unlike the fixed header).
 */
interface Props {
  /** Whether the drawer is currently open — drives the Меню tab's active/hamburger state. */
  drawerOpen: boolean;
  /**
   * Whether the bar should be hidden (slid off-screen). Driven by SiteHeader's
   * scroll-direction state — the same signal that hides the desktop header — so
   * the bar tucks away on scroll-down and reappears on scroll-up.
   */
  hidden: boolean;
  /** Toggle the drawer (owned by SiteHeader so the drawer and this bar share state). */
  onToggleDrawer: () => void;
}

/** A tab link. `active` when the current path is (or is under) `href`. */
const TABS = [
  { label: "Начало", href: "/", Icon: HomeIcon, exact: true },
  { label: "Автомобили", href: "/vsichki-avtomobili/", Icon: CarIcon, exact: false },
  { label: "Carfax", href: "/carfax/", Icon: GlobeIcon, exact: false },
] as const;

export function MobileBottomNav({ drawerOpen, hidden, onToggleDrawer }: Props) {
  const pathname = usePathname();

  // Normalise the current path to always have a trailing slash so it matches the
  // NAV hrefs (which are stored with one), then compare. Home matches exactly;
  // section tabs match their sub-tree (e.g. /vsichki-avtomobili/... stays active).
  const current = pathname.endsWith("/") ? pathname : `${pathname}/`;
  const isActive = (href: string, exact: boolean) =>
    exact ? current === href : current === href || current.startsWith(href);

  return (
    <nav
      aria-label="Основна навигация"
      className={`fixed inset-x-0 bottom-0 z-10000 border-t border-white/8 bg-shell/85 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl transition-transform duration-300 ease-out will-change-transform lg:hidden ${
        hidden ? "translate-y-full" : "translate-y-0"
      }`}
    >
      <ul className="m-0 grid list-none grid-cols-4 p-0">
        {TABS.map(({ label, href, Icon, exact }) => {
          const active = isActive(href, exact);
          return (
            <li key={label} className="contents">
              <LinkButton
                href={href}
                rippleTheme="light"
                aria-current={active ? "page" : undefined}
                className={`flex min-h-15.5 flex-col items-center justify-center gap-1 rounded-none px-1 py-2 text-[11px] font-semibold transition-colors ${
                  active ? "text-brand-soft" : "text-white/55"
                }`}
              >
                <Icon className="size-6" />
                <span className="leading-none">{label}</span>
              </LinkButton>
            </li>
          );
        })}

        {/* Меню — opens the drawer. Reuses the animated hamburger glyph so the
            bars morph into a cross while the drawer is open, and mirrors the
            tab-link layout (icon over label) for a consistent grid. */}
        <li className="contents">
          <Button
            onClick={onToggleDrawer}
            rippleTheme="light"
            aria-label={drawerOpen ? "Затвори менюто" : "Отвори менюто"}
            aria-expanded={drawerOpen}
            className={`flex min-h-15.5 flex-col items-center justify-center gap-1 rounded-none px-1 py-2 text-[11px] font-semibold transition-colors ${
              drawerOpen ? "text-brand-soft" : "text-white/55"
            }`}
          >
            {/* Presentational glyph only — the parent <Button> owns the tap,
                ripple and a11y. */}
            <NavHamburger active={drawerOpen} />
            <span className="leading-none">Меню</span>
          </Button>
        </li>
      </ul>
    </nav>
  );
}
