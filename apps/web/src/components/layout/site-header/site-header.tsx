"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/common";
import { NAV } from "@/data/navigation";
import { useInquiry } from "@/contexts/inquiry-context";
import { NavHamburger } from "./nav-hamburger";

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
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [openSub, setOpenSub] = useState<string | null>(null);
  const [hidden, setHidden] = useState(false);
  const headerRef = useRef<HTMLElement | null>(null);

  // Publish the header's real height to `--header-h` so page top-padding tracks
  // it exactly. ResizeObserver keeps it correct through breakpoint/content
  // changes (e.g. logo swap at lg). Measured on <html> so every page can read it.
  useEffect(() => {
    const el = headerRef.current;
    if (!el) return;

    const root = document.documentElement;
    const publish = () => {
      root.style.setProperty("--header-h", `${Math.round(el.offsetHeight)}px`);
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

  // Hide the header when scrolling down past it, reveal it when scrolling up.
  // rAF-throttled so the scroll handler does no layout work per event.
  useEffect(() => {
    let lastY = window.scrollY;
    let ticking = false;

    const update = () => {
      ticking = false;
      const y = window.scrollY;
      const delta = y - lastY;
      // Ignore sub-pixel jitter; never hide near the very top of the page.
      if (Math.abs(delta) > 6) {
        setHidden(delta > 0 && y > 120);
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

  // Keep the header visible whenever the mobile drawer is open.
  const isHidden = hidden && !drawerOpen;

  return (
    <>
      <header
        ref={headerRef}
        className={`fixed inset-x-0 top-0 z-[9999] border-b border-white/[0.06] bg-shell/88 px-0 py-3.5 backdrop-blur-xl transition-transform duration-300 ease-out will-change-transform ${
          isHidden ? "-translate-y-full" : "translate-y-0"
        }`}
      >
        <div className="mx-auto w-[min(100%-28px,1280px)]">
          <div className="flex min-h-[78px] items-center justify-between gap-6 rounded-[24px] bg-gradient-to-r from-brand to-brand-dark px-[26px] shadow-[0_16px_40px_rgba(0,0,0,0.2)] max-lg:min-h-[72px] max-lg:rounded-none max-lg:bg-none max-lg:px-0 max-lg:shadow-none">
            {/* Logo */}
            <Link href="/" className="inline-flex items-center">
              <Image
                src="/logo.png"
                alt="SelectAuto"
                width={150}
                height={62}
                priority
                className="h-[62px] w-auto object-contain max-lg:h-[50px]"
              />
            </Link>

            {/* Desktop nav */}
            <nav className="flex items-center max-lg:hidden">
              <ul className="flex items-center gap-[30px]">
                {NAV.map((item) => (
                  <li key={item.label} className="group relative">
                    <Link
                      href={item.href}
                      className="relative inline-flex min-h-[44px] items-center text-base font-bold text-white after:absolute after:bottom-[5px] after:left-0 after:h-0.5 after:w-0 after:rounded-full after:bg-[#fff2d9] after:transition-[width] after:duration-200 group-hover:after:w-full"
                    >
                      {item.label}
                    </Link>
                    {item.children && (
                      <ul className="invisible absolute left-0 top-full z-50 mt-3 min-w-[220px] translate-y-2 rounded-2xl bg-white p-2.5 opacity-0 shadow-[0_18px_40px_rgba(0,0,0,0.16)] transition-all duration-200 group-hover:visible group-hover:translate-y-0 group-hover:opacity-100">
                        {item.children.map((sub) => (
                          <li key={sub.label}>
                            <Link
                              href={sub.href}
                              className="block rounded-xl px-3.5 py-3 text-sm font-semibold text-[#1d1d1d] transition-colors hover:bg-brand/[0.08] hover:text-brand-dark"
                            >
                              {sub.label}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    )}
                  </li>
                ))}
              </ul>
            </nav>

            {/* Desktop inquiry button */}
            <div className="flex items-center gap-[22px] max-lg:hidden">
              <Button
                onClick={openInquiry}
                rippleTheme="light"
                className="inline-flex min-h-[54px] items-center justify-center rounded-full border border-white/25 bg-white/10 px-6 text-[15px] font-extrabold text-white transition-transform duration-200 hover:-translate-y-0.5"
              >
                Запитване
              </Button>
            </div>

            {/* Mobile drawer toggle */}
            <NavHamburger
              active={drawerOpen}
              onClick={() => setDrawerOpen((open) => !open)}
              aria-label={drawerOpen ? "Затвори менюто" : "Отвори менюто"}
              aria-expanded={drawerOpen}
              className="hidden max-lg:inline-block"
            />
          </div>
        </div>
      </header>

      {/* Drawer overlay */}
      <div
        onClick={() => setDrawerOpen(false)}
        className={`fixed inset-0 z-[10040] bg-black/[0.52] transition-opacity duration-200 lg:hidden ${
          drawerOpen ? "visible opacity-100" : "invisible opacity-0"
        }`}
      />

      {/* Drawer */}
      <aside
        className={`fixed right-0 top-0 z-[10050] h-[100dvh] w-[min(88vw,380px)] overflow-y-auto bg-gradient-to-b from-[#121318] to-[#0b0c10] shadow-[-12px_0_40px_rgba(0,0,0,0.28)] transition-transform duration-300 lg:hidden ${
          drawerOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="sticky top-0 z-[2] flex items-center justify-between gap-3 border-b border-white/[0.08] bg-[#121318]/[0.94] px-4 py-[18px] backdrop-blur-md">
          <p className="m-0 text-sm font-extrabold uppercase tracking-[0.08em] text-white">
            Меню
          </p>
          <Button
            onClick={() => setDrawerOpen(false)}
            rippleTheme="light"
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/[0.08] text-white"
            aria-label="Затвори менюто"
          >
            ✕
          </Button>
        </div>
        <div className="pb-[calc(22px+env(safe-area-inset-bottom))] pt-2.5">
          <ul className="m-0 list-none p-0">
            {NAV.map((item) =>
              item.children ? (
                <li
                  key={item.label}
                  className="border-b border-white/[0.06]"
                >
                  <Button
                    onClick={() =>
                      setOpenSub(openSub === item.label ? null : item.label)
                    }
                    rippleTheme="light"
                    className="flex min-h-[56px] w-full items-center justify-between gap-3 px-[18px] text-[15px] font-bold text-[#f2f3f5]"
                  >
                    {item.label}
                    <span
                      className={`transition-transform duration-200 ${
                        openSub === item.label ? "rotate-180" : ""
                      }`}
                    >
                      ⌄
                    </span>
                  </Button>
                  {openSub === item.label && (
                    <ul className="m-0 list-none bg-white/[0.02] p-0 pb-2.5 pt-1.5">
                      {item.children.map((sub) => (
                        <li key={sub.label}>
                          <Link
                            href={sub.href}
                            onClick={() => setDrawerOpen(false)}
                            className="block py-[11px] pl-[30px] pr-[18px] text-sm font-semibold text-white/70"
                          >
                            {sub.label}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              ) : (
                <li key={item.label} className="border-b border-white/[0.06]">
                  <Link
                    href={item.href}
                    onClick={() => setDrawerOpen(false)}
                    className="flex min-h-[56px] items-center px-[18px] text-[15px] font-bold text-[#f2f3f5]"
                  >
                    {item.label}
                  </Link>
                </li>
              ),
            )}
          </ul>
          <div className="px-[18px] pt-5">
            <Button
              onClick={() => {
                setDrawerOpen(false);
                openInquiry();
              }}
              rippleTheme="light"
              className="inline-flex min-h-[54px] w-full items-center justify-center rounded-full bg-gradient-to-r from-brand-dark to-brand px-6 text-[15px] font-extrabold text-white shadow-[0_12px_26px_rgba(216,111,22,0.24)]"
            >
              Направете запитване
            </Button>
          </div>
        </div>
      </aside>
    </>
  );
}

