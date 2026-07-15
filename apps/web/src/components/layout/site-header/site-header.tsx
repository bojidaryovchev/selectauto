"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { useSession } from "next-auth/react";
import { Button, LinkButton } from "@/components/common";
import { UserMenu } from "@/components/auth";
import { ChevronDownIcon } from "@/components/icons";
import { NAV } from "@/data/navigation";
import { useInquiry } from "@/contexts/inquiry-context";
import { MobileBottomNav } from "./mobile-bottom-nav";

/**
 * Fixed header with the orange gradient pill shell on desktop and a slide-in
 * drawer + fixed bottom-nav on mobile. Ported from the site's `sa-site-header`
 * and `sa-mobile-*` styles.
 *
 * The header is `position: fixed`, so it occupies no layout space. Pages whose
 * content starts at the top (the light catalog/detail pages) offset it with
 * `pt-(--header-h)`. That token has a static fallback in globals.css, but we
 * also measure the real rendered height here and publish it to `--header-h` so
 * the offset is always pixel-exact across viewports (and never drifts if the
 * header's padding/min-height changes).
 */
export function SiteHeader() {
  const { open: openInquiry } = useInquiry();
  // Auth.js session state for the header controls. `status` is "loading" until the
  // SessionProvider resolves; we treat anything but "authenticated" as signed-out
  // (shows the "Вход" button), which swaps to the account menu once authenticated.
  const { status } = useSession();
  const isSignedIn = status === "authenticated";
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [openSub, setOpenSub] = useState<string | null>(null);
  const [hidden, setHidden] = useState(false);
  const headerRef = useRef<HTMLElement | null>(null);
  // Honor prefers-reduced-motion for the drawer sub-menu height animation.
  const reduce = useReducedMotion();

  // Current path (trailing-slash normalised to match the NAV hrefs) so the
  // drawer can highlight the active entry, mirroring the bottom nav.
  const pathname = usePathname();
  const currentPath = pathname.endsWith("/") ? pathname : `${pathname}/`;
  const isActivePath = (href: string) =>
    href === "/" ? currentPath === "/" : currentPath === href || currentPath.startsWith(href);

  // Publish the header's real height to `--header-h` so page top-padding tracks
  // it exactly. ResizeObserver keeps it correct through breakpoint/content
  // changes (e.g. logo swap at lg). Measured on <html> so every page can read it.
  useEffect(() => {
    const el = headerRef.current;
    if (!el) return;

    const root = document.documentElement;
    const publish = () => {
      const h = Math.round(el.offsetHeight);
      // The header is `max-lg:hidden`, and offsetHeight is also 0 for any frame
      // where it isn't laid out yet. Writing that 0 as an INLINE style would
      // override the CSS media-query fallback (`--header-h: 107px` at ≥1024) and
      // collapse every page's `pt-(--header-h)` to 0 — the content sits under the
      // fixed header for a frame, then snaps down ~107px when the next measurement
      // writes the real height. So only publish a real, positive height; when the
      // header is genuinely hidden (mobile) the CSS base value (0) already applies.
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

  // Lock body scroll while the mobile drawer is open.
  useEffect(() => {
    document.body.style.overflow = drawerOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [drawerOpen]);

  // Always reveal the header when the route changes. Header visibility is otherwise
  // driven purely by scroll direction, with no reset tied to navigation — so a
  // `hidden` state set on one page carries onto the next. A client navigation can
  // also land the new page at a deep, *restored* scroll position (the catalog's
  // `?after=` restore teleports far down the feed), and the scroll handler below
  // deliberately does NOT react to such teleports when they land away from the top
  // (`Math.abs(delta) > 1000` re-anchors without revealing unless `y <= 120`).
  // Together that leaves the header stuck off-screen after some navigations until
  // the user manually scrolls up. Reset on the pathname change itself — done during
  // render (not in an effect) so the new page never paints a carried-over hidden
  // header even for a frame. It hides again normally once you scroll down the page.
  const [lastPath, setLastPath] = useState(pathname);
  if (pathname !== lastPath) {
    setLastPath(pathname);
    setHidden(false);
  }

  // Hide the header when scrolling down past it, reveal it when scrolling up.
  // rAF-throttled so the scroll handler does no layout work per event.
  useEffect(() => {
    let lastY = window.scrollY;
    let ticking = false;
    let downFrames = 0;

    const update = () => {
      ticking = false;
      const y = window.scrollY;
      const delta = y - lastY;
      // A multi-thousand-px jump in one frame is a TELEPORT (programmatic
      // scrollTo, e.g. the catalog's `?after=` restore jumping deep into the
      // feed on load), not a user gesture — reacting to its direction would
      // flicker the header. Re-anchor the baseline and keep the current
      // state — except near the page top, where the header must always be
      // visible.
      if (Math.abs(delta) > 1000) {
        lastY = y;
        downFrames = 0;
        if (y <= 120) setHidden(false);
        return;
      }
      // Ignore sub-pixel jitter; never hide near the very top of the page.
      if (Math.abs(delta) > 6) {
        // HIDING requires the down-motion to persist for 2+ consecutive frames.
        // Real scrolling always does (Chrome spreads even one wheel notch over
        // many frames); the virtualizer's one-frame row-measurement corrections
        // (tens to a few hundred px, downward) never do — without this they
        // blink the header out mid-pause. Revealing stays instant.
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

  // Header visibility is driven purely by scroll direction. It used to also be
  // force-shown while the drawer was open (back when the hamburger lived in the
  // header — hiding it would have hidden the only way to close the menu). The
  // drawer trigger now lives in the bottom nav and the drawer renders above the
  // header (z-[10050] > z-[9999]), so pinning the header buys nothing — decoupled.
  const isHidden = hidden;

  return (
    <>
      <header
        ref={headerRef}
        className={`fixed inset-x-0 top-0 z-9999 border-b border-white/6 bg-shell/88 px-0 py-3.5 backdrop-blur-xl transition-transform duration-300 ease-out will-change-transform max-lg:hidden ${
          isHidden ? "-translate-y-full" : "translate-y-0"
        }`}
      >
        <div className="mx-auto w-[min(100%-28px,1280px)]">
          <div className="flex min-h-19.5 items-center justify-between gap-6 rounded-card bg-linear-to-r from-brand to-brand-dark px-6.5 shadow-[0_16px_40px_rgba(0,0,0,0.2)] max-lg:min-h-18 max-lg:rounded-none max-lg:bg-none max-lg:px-0 max-lg:shadow-none">
            {/* Logo. On mobile the desktop nav + action buttons are hidden, so the
                logo is the only child of this row — stretch it full-width and
                center its content so the logo sits in the middle of the bar.
                Desktop keeps the natural inline (left) placement. */}
            <Link href="/" className="inline-flex items-center max-lg:w-full max-lg:justify-center">
              <Image
                src="/logo.png"
                alt="SelectAuto"
                width={150}
                height={62}
                priority
                className="h-15.5 w-auto object-contain max-lg:h-12.5"
              />
            </Link>

            {/* Desktop nav */}
            <nav className="flex items-center max-lg:hidden">
              <ul className="flex items-center gap-7.5">
                {NAV.map((item) => (
                  <li key={item.label} className="group relative">
                    <Link
                      href={item.href}
                      className="relative inline-flex min-h-11 items-center text-base font-bold text-white after:absolute after:bottom-1.25 after:left-0 after:h-0.5 after:w-0 after:rounded-full after:bg-[#fff2d9] after:transition-[width] after:duration-200 group-hover:after:w-full"
                    >
                      {item.label}
                    </Link>
                    {item.children && (
                      <ul className="invisible absolute left-0 top-full z-50 mt-3 min-w-55 translate-y-2 rounded-2xl bg-white p-2.5 opacity-0 shadow-[0_18px_40px_rgba(0,0,0,0.16)] transition-all duration-200 group-hover:visible group-hover:translate-y-0 group-hover:opacity-100">
                        {item.children.map((sub) => (
                          <li key={sub.label}>
                            <LinkButton
                              href={sub.href}
                              rippleTheme="dark"
                              className="block whitespace-nowrap rounded-xl px-3.5 py-3 text-sm font-semibold text-[#1d1d1d] transition-colors hover:bg-brand/8 hover:text-brand-dark"
                            >
                              {sub.label}
                            </LinkButton>
                          </li>
                        ))}
                      </ul>
                    )}
                  </li>
                ))}
              </ul>
            </nav>

            {/* Desktop inquiry button + auth controls */}
            <div className="flex items-center gap-4.5 max-lg:hidden">
              <Button
                onClick={() => openInquiry()}
                rippleTheme="light"
                className="inline-flex min-h-13.5 items-center justify-center rounded-full border border-white/25 bg-white/10 px-6 text-[15px] font-extrabold text-white transition-transform duration-200 hover:-translate-y-0.5"
              >
                Запитване
              </Button>
              {/* Signed out → "Вход" links to the sign-in page; signed in → the
                  account dropdown (favourites + sign-out). */}
              {isSignedIn ? (
                <UserMenu tone="light" />
              ) : (
                <LinkButton
                  href="/sign-in"
                  rippleTheme="dark"
                  className="inline-flex min-h-13.5 items-center justify-center rounded-full bg-white px-6 text-[15px] font-extrabold text-brand-dark transition-transform duration-200 hover:-translate-y-0.5"
                >
                  Вход
                </LinkButton>
              )}
            </div>

            {/* The mobile drawer toggle now lives in the fixed bottom nav (the
                Меню tab) — see <MobileBottomNav> below. */}
          </div>
        </div>
      </header>

      {/* Fixed app-style bottom tab bar (mobile only). Shares the drawer state so
          its Меню tab opens the same slide-in drawer rendered below. */}
      <MobileBottomNav
        drawerOpen={drawerOpen}
        hidden={isHidden}
        onToggleDrawer={() => setDrawerOpen((open) => !open)}
      />

      {/* Drawer overlay */}
      <div
        onClick={() => setDrawerOpen(false)}
        className={`fixed inset-0 z-10040 bg-black/52 transition-opacity duration-200 lg:hidden ${
          drawerOpen ? "visible opacity-100" : "invisible opacity-0"
        }`}
      />

      {/* Drawer */}
      <aside
        className={`fixed right-0 top-0 z-10050 h-dvh w-[min(88vw,380px)] overflow-y-auto bg-linear-to-b from-[#121318] to-[#0b0c10] transition-transform duration-300 lg:hidden ${
          // The shadow is cast to the LEFT (-12px, 40px blur). While the drawer is
          // parked off-canvas (translate-x-full moves it right by only its own
          // width), that shadow would bleed ~52px back onto the viewport's right
          // edge as a dark strip on every mobile page — so only render it while
          // the drawer is actually open.
          drawerOpen ? "translate-x-0 shadow-[-12px_0_40px_rgba(0,0,0,0.28)]" : "translate-x-full"
        }`}
      >
        <div className="sticky top-0 z-2 flex items-center justify-between gap-3 border-b border-white/8 bg-[#121318]/94 px-4 py-4.5 backdrop-blur-md">
          <p className="m-0 text-sm font-extrabold uppercase tracking-[0.08em] text-white">
            Меню
          </p>
          <Button
            onClick={() => setDrawerOpen(false)}
            rippleTheme="light"
            className="flex size-10 items-center justify-center rounded-xl bg-white/8 text-white"
            aria-label="Затвори менюто"
          >
            ✕
          </Button>
        </div>
        <div className="pb-[calc(22px+env(safe-area-inset-bottom))]">
          <nav aria-label="Меню навигация">
            <ul className="m-0 list-none p-0">
              {NAV.map((item) =>
                item.children ? (
                  <li key={item.label} className="border-b border-white/6">
                    <Button
                      onClick={() =>
                        setOpenSub(openSub === item.label ? null : item.label)
                      }
                      rippleTheme="light"
                      aria-expanded={openSub === item.label}
                      className="flex min-h-14 w-full items-center justify-between gap-3 px-4.5 text-[15px] font-bold text-[#f2f3f5]"
                    >
                      {item.label}
                      <motion.span
                        aria-hidden
                        animate={{ rotate: openSub === item.label ? 180 : 0 }}
                        transition={reduce ? { duration: 0 } : { duration: 0.3, ease: "easeInOut" }}
                        className="shrink-0 text-white/70"
                      >
                        <ChevronDownIcon className="size-4" />
                      </motion.span>
                    </Button>
                    {/* Sub-menu animates height 0 ↔ auto (matching ExpandableSection)
                        instead of snapping; children stay mounted so the links are in
                        the DOM even while collapsed. */}
                    <motion.div
                      initial={false}
                      animate={{
                        height: openSub === item.label ? "auto" : 0,
                        opacity: openSub === item.label ? 1 : 0,
                      }}
                      transition={reduce ? { duration: 0 } : { duration: 0.32, ease: [0.32, 0.72, 0, 1] }}
                      style={{ overflow: "hidden" }}
                    >
                      <ul className="m-0 list-none bg-white/2 p-0">
                        {item.children.map((sub) => {
                          const active = isActivePath(sub.href);
                          return (
                            <li key={sub.label}>
                              <LinkButton
                                href={sub.href}
                                rippleTheme="light"
                                onClick={() => setDrawerOpen(false)}
                                aria-current={active ? "page" : undefined}
                                className={`flex min-h-14 items-center pl-7.5 pr-4.5 text-sm font-semibold transition-colors ${
                                  active ? "text-brand-soft" : "text-white/70"
                                }`}
                              >
                                {sub.label}
                              </LinkButton>
                            </li>
                          );
                        })}
                      </ul>
                    </motion.div>
                  </li>
                ) : (
                  (() => {
                    const active = isActivePath(item.href);
                    return (
                      <li key={item.label} className="border-b border-white/6">
                        <LinkButton
                          href={item.href}
                          rippleTheme="light"
                          onClick={() => setDrawerOpen(false)}
                          aria-current={active ? "page" : undefined}
                          className={`flex min-h-14 items-center px-4.5 text-[15px] font-bold transition-colors ${
                            active ? "bg-brand/12 text-brand-soft" : "text-[#f2f3f5]"
                          }`}
                        >
                          {/* Active row reads as a highlighted, selected row: a
                              subtle brand wash + a full-height left accent bar in
                              the gutter. The bar is absolutely positioned so it
                              never shifts the label — every row's text stays flush
                              at px-[18px] whether active or not. */}
                          <span
                            aria-hidden="true"
                            className={`absolute inset-y-0 left-0 w-1 transition-colors ${
                              active ? "bg-brand-soft" : "bg-transparent"
                            }`}
                          />
                          {item.label}
                        </LinkButton>
                      </li>
                    );
                  })()
                ),
              )}
            </ul>
          </nav>
          <div className="flex flex-col gap-3 px-4.5 pt-5">
            <Button
              onClick={() => {
                setDrawerOpen(false);
                openInquiry();
              }}
              rippleTheme="light"
              className="inline-flex min-h-13.5 w-full items-center justify-center rounded-full bg-linear-to-r from-brand-dark to-brand px-6 text-[15px] font-extrabold text-white shadow-[0_12px_26px_rgba(216,111,22,0.24)]"
            >
              Направете запитване
            </Button>
            {/* Auth: signed-out links to sign-in; signed-in shows the account menu
                with a label so it's obvious in the dark drawer. */}
            {isSignedIn ? (
              <div className="flex items-center gap-3 rounded-full border border-white/10 bg-white/6 px-5 py-2.5">
                <UserMenu tone="dark" />
                <span className="text-sm font-bold text-white/80">Моят профил</span>
              </div>
            ) : (
              <LinkButton
                href="/sign-in"
                rippleTheme="light"
                onClick={() => setDrawerOpen(false)}
                className="inline-flex min-h-13.5 w-full items-center justify-center rounded-full border border-white/20 bg-white/10 px-6 text-[15px] font-extrabold text-white"
              >
                Вход / Регистрация
              </LinkButton>
            )}
          </div>
        </div>
      </aside>
    </>
  );
}

