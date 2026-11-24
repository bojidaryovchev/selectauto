"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { IconButton, LinkButton, Logo, ThemeSwitch } from "@/components/common";
import { UserMenu } from "@/components/auth";
import { ChevronDownIcon, ChevronRightIcon, CloseIcon } from "@/components/icons";
import { NAV } from "@/data/navigation";
import { InquiryButton } from "@/components/inquiry/inquiry-button";
import { useHasPainted } from "@/lib/after-first-paint";
import { DrawerProfilePanel } from "./drawer-profile-panel";
import { HeaderDropdown } from "./header-dropdown";
import { MobileBottomNav } from "./mobile-bottom-nav";

/**
 * The site's chrome (boards `ac-hdr`, `ac-drawer`, `ac-drawer-tab`; parity check docs/design/parity/shell.md):
 *
 * - from 1024 px, the header: logo, navigation with dropdowns, the account control and „Запитване";
 * - below 1024 px, a slim top bar with the logo, the bottom tab bar, and the menu drawer that the Меню tab opens,
 *   with a profile screen that slides over it.
 *
 * The header (or the top bar) is `position: fixed`, so it occupies no layout space. Pages offset it with
 * `pt-(--header-h)`. That token has a static fallback in globals.css, but the real rendered height is also measured
 * here and published to `--header-h`, so the offset is pixel-exact at every width.
 *
 * Both bars and the bottom tabs hide on scroll down and come back on scroll up, and are always shown near the top.
 * While they're hidden, `<html>` carries `data-bars-hidden`.
 */
export function SiteHeader() {
  // Auth.js session state. `status` is "loading" until the SessionProvider resolves; meanwhile the account control is
  // a placeholder of its size, so a signed-in visitor never sees „Вход" flash.
  const { data: session, status } = useSession();
  const isSignedIn = status === "authenticated";
  const initial = (session?.user?.name || session?.user?.email || "?").trim().charAt(0).toUpperCase();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [openSub, setOpenSub] = useState<string | null>(null);
  // Whether the profile screen is pushed over the drawer.
  const [profileOpen, setProfileOpen] = useState(false);
  const [hidden, setHidden] = useState(false);
  const headerRef = useRef<HTMLElement | null>(null);
  // No route prefetch from the plain <Link>s until the page has painted — see useHasPainted.
  const painted = useHasPainted();

  // Current path (trailing-slash normalised to match the NAV hrefs), to mark the current page.
  const pathname = usePathname();
  const currentPath = pathname.endsWith("/") ? pathname : `${pathname}/`;
  const isActivePath = (href: string) =>
    href === "/" ? currentPath === "/" : currentPath === href || currentPath.startsWith(href);

  // Publish the visible bar's real height to `--header-h`, so page top padding tracks it exactly. ResizeObserver
  // keeps it right through breakpoint changes (header ↔ top bar). Measured on <html> so every page can read it.
  useEffect(() => {
    const el = headerRef.current;
    if (!el) return;

    const root = document.documentElement;
    const publish = () => {
      const h = Math.round(el.offsetHeight);
      // offsetHeight is 0 for any frame where the header isn't laid out yet. Writing that 0 as an INLINE style would
      // override the CSS fallback in globals.css and collapse every page's `pt-(--header-h)`, so only a real, positive
      // height is published.
      if (h > 0) root.style.setProperty("--header-h", `${h}px`);
    };
    publish();

    const ro = new ResizeObserver(publish);
    ro.observe(el);
    return () => {
      ro.disconnect();
      root.style.removeProperty("--header-h");
    };
  }, []);

  // Lock body scroll while the drawer is open; Esc closes it.
  useEffect(() => {
    document.body.style.overflow = drawerOpen ? "hidden" : "";
    if (!drawerOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setDrawerOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      document.removeEventListener("keydown", onKey);
    };
  }, [drawerOpen]);

  // The profile screen only lives on top of an open drawer — pop it back to the menu whenever the drawer closes, so
  // reopening the drawer always lands on the menu. Adjusted during render (the React-recommended pattern), so no
  // cascading effect render is needed.
  const [drawerWasOpen, setDrawerWasOpen] = useState(drawerOpen);
  if (drawerWasOpen !== drawerOpen) {
    setDrawerWasOpen(drawerOpen);
    if (!drawerOpen) setProfileOpen(false);
  }

  // Always reveal the bars when the route changes. Their visibility otherwise follows the scroll direction only, so a
  // hidden state from one page would carry onto the next; a client navigation can also land at a deep, restored
  // scroll position (the catalog's `?after=` restore), which the scroll handler deliberately ignores. Reset during
  // render, so the new page never paints a carried-over hidden bar.
  const [lastPath, setLastPath] = useState(pathname);
  if (pathname !== lastPath) {
    setLastPath(pathname);
    setHidden(false);
  }

  // Mark <html> while the bars are hidden, so a page's own bottom bar (the car page's action bar) can slide down to
  // the edge with the tabs.
  useEffect(() => {
    document.documentElement.toggleAttribute("data-bars-hidden", hidden);
  }, [hidden]);
  useEffect(() => () => document.documentElement.removeAttribute("data-bars-hidden"), []);

  // Hide the bars when scrolling down past them, reveal them when scrolling up. rAF-throttled.
  useEffect(() => {
    let lastY = window.scrollY;
    let ticking = false;
    let downFrames = 0;

    const update = () => {
      ticking = false;
      const y = window.scrollY;
      const delta = y - lastY;
      // A multi-thousand-px jump in one frame is a TELEPORT (a programmatic scrollTo, e.g. the catalog's `?after=`
      // restore), not a gesture. Re-anchor and keep the current state, except near the top, where the bars must show.
      if (Math.abs(delta) > 1000) {
        lastY = y;
        downFrames = 0;
        if (y <= 120) setHidden(false);
        return;
      }
      // Ignore sub-pixel jitter; never hide near the very top of the page.
      if (Math.abs(delta) > 6) {
        // Hiding needs the down-motion to persist for 2+ consecutive frames. Real scrolling always does; the
        // virtualizer's one-frame row-measurement corrections never do. Revealing stays instant.
        if (delta > 0) {
          downFrames += 1;
          if (downFrames >= 2 && y > 120) setHidden(true);
        } else {
          downFrames = 0;
          setHidden(false);
        }
        lastY = y;
      }
    };

    const onScroll = () => {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(update);
      }
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const closeDrawer = () => setDrawerOpen(false);

  return (
    <>
      <header
        ref={headerRef}
        // Night in both themes: the gold logo sits on dark grounds only (styles/tokens.css, light mode).
        data-theme="dark"
        className={`fixed inset-x-0 top-0 z-9999 transition-transform duration-300 ease-out will-change-transform motion-reduce:transition-none ${
          hidden ? "-translate-y-full" : "translate-y-0"
        }`}
      >
        {/* Desktop, from 1024 px. */}
        <div className="sa-hdr">
          <div className="sa-wrap sa-hdr__in">
            <Link href="/" prefetch={painted ? undefined : false} className="sa-hdr__logo">
              {/* No preload: the header is hidden on phones, and a preload is fetched even then. */}
              <Logo size="header" fetchPriority="high" />
            </Link>

            <nav className="sa-hdr__nav" aria-label="Основна навигация">
              {NAV.map((item) =>
                item.children ? (
                  <HeaderDropdown
                    key={item.label}
                    item={{ ...item, children: item.children }}
                    active={item.children.some((sub) => isActivePath(sub.href))}
                    isActivePath={isActivePath}
                    painted={painted}
                  />
                ) : (
                  <Link
                    key={item.label}
                    href={item.href}
                    prefetch={painted ? undefined : false}
                    aria-current={isActivePath(item.href) ? "page" : undefined}
                  >
                    {item.label}
                  </Link>
                ),
              )}
            </nav>

            <div className="sa-hdr__act">
              <ThemeSwitch />
              {status === "loading" ? (
                <span className="sa-sk block size-10 rounded-full" aria-hidden="true" />
              ) : isSignedIn ? (
                <UserMenu />
              ) : (
                <LinkButton href="/sign-in" variant="sec" size="md">
                  Вход
                </LinkButton>
              )}
              <InquiryButton variant="pri" size="md">
                Запитване
              </InquiryButton>
            </div>
          </div>
        </div>

        {/* Phones and tablets: the slim top bar with the logo. */}
        <div className="sa-tbar">
          <Link href="/" prefetch={painted ? undefined : false} className="flex">
            <Logo size="bar" />
          </Link>
          <ThemeSwitch />
        </div>
      </header>

      {/* The bottom tab bar shares the drawer state, so its Меню tab opens the drawer below. */}
      <MobileBottomNav
        drawerOpen={drawerOpen}
        hidden={hidden}
        onToggleDrawer={() => setDrawerOpen((open) => !open)}
      />

      {/* Dimmed page behind the drawer; a press on it closes the drawer. */}
      <div
        aria-hidden="true"
        onClick={closeDrawer}
        className={`sa-scrim fixed z-10040 transition-opacity duration-200 motion-reduce:transition-none lg:hidden ${
          drawerOpen ? "visible opacity-100" : "invisible opacity-0"
        }`}
      />

      <aside
        aria-label="Меню"
        // Night in both themes, like the header and the bottom tabs it belongs with.
        data-theme="dark"
        inert={!drawerOpen}
        className={`sa-drawer fixed right-0 top-0 z-10050 h-dvh w-[min(88vw,380px)] transition-transform duration-300 motion-reduce:transition-none lg:hidden ${
          drawerOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="sa-drawer__h">
          <b>Меню</b>
          <IconButton label="Затворете менюто" variant="ghost" onClick={closeDrawer}>
            <CloseIcon />
          </IconButton>
        </div>

        <nav className="sa-drawer__nav" aria-label="Меню навигация">
          {NAV.map((item) => {
            if (!item.children) {
              const active = isActivePath(item.href);
              return (
                <Link
                  key={item.label}
                  href={item.href}
                  prefetch={painted ? undefined : false}
                  onClick={closeDrawer}
                  aria-current={active ? "page" : undefined}
                  className={active ? "is-on" : undefined}
                >
                  {item.label}
                </Link>
              );
            }
            const expanded = openSub === item.label;
            return (
              <div key={item.label}>
                <button
                  type="button"
                  aria-expanded={expanded}
                  onClick={() => setOpenSub(expanded ? null : item.label)}
                >
                  {item.label}
                  <ChevronDownIcon
                    className={`transition-transform duration-300 ease-in-out motion-reduce:transition-none ${
                      expanded ? "rotate-180 text-ortx" : ""
                    }`}
                  />
                </button>
                {/* The group's pages animate height 0 ↔ auto as a grid row going 0fr ↔ 1fr, and stay in the DOM
                    while collapsed, so the links are always there for crawlers. */}
                <div
                  className={`grid transition-[grid-template-rows,opacity] duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] motion-reduce:transition-none ${
                    expanded ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
                  }`}
                >
                  <div className="sa-drawer__sub min-h-0 overflow-hidden" inert={!expanded}>
                    {item.children.map((sub) => {
                      const active = isActivePath(sub.href);
                      return (
                        <Link
                          key={sub.href}
                          href={sub.href}
                          prefetch={painted ? undefined : false}
                          onClick={closeDrawer}
                          aria-current={active ? "page" : undefined}
                          className={active ? "is-on" : undefined}
                        >
                          {sub.label}
                        </Link>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })}
        </nav>

        <div className="sa-drawer__f pb-[calc(20px+env(safe-area-inset-bottom))]">
          <InquiryButton variant="pri" block onClick={closeDrawer}>
            Направете запитване
          </InquiryButton>
          {status === "loading" ? (
            <span className="sa-sk block h-12 rounded-md" aria-hidden="true" />
          ) : isSignedIn ? (
            // A row that pushes the profile screen in from the right.
            <button
              type="button"
              onClick={() => setProfileOpen(true)}
              aria-haspopup="menu"
              aria-expanded={profileOpen}
              className="flex min-h-15 w-full cursor-pointer items-center gap-3 rounded-lg border-0 bg-s2 py-2 pl-2 pr-3.5 text-left text-tx shadow-[inset_0_0_0_1px_var(--color-hair2)]"
            >
              <span className="sa-avatar">{initial}</span>
              <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                <b className="text-[15px] font-extrabold leading-tight">Моят профил</b>
                {session?.user?.email ? (
                  <small className="truncate text-[13px] text-tx3">{session.user.email}</small>
                ) : null}
              </span>
              <ChevronRightIcon className="size-4.5 shrink-0 text-tx2" />
            </button>
          ) : (
            <LinkButton href="/sign-in" variant="sec" block onClick={closeDrawer}>
              Вход / Регистрация
            </LinkButton>
          )}
        </div>
      </aside>

      {/* The profile screen, mounted only while signed in. */}
      {isSignedIn ? (
        <DrawerProfilePanel open={profileOpen} onBack={() => setProfileOpen(false)} onNavigate={closeDrawer} />
      ) : null}
    </>
  );
}
