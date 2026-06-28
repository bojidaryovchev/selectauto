"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { NAV } from "@/data/navigation";
import { useInquiry } from "@/contexts/inquiry-context";
import { MobileTab } from "./mobile-tab";

/**
 * Sticky header with the orange gradient pill shell on desktop and a slide-in
 * drawer + fixed bottom-nav on mobile. Ported from the site's `sa-site-header`
 * and `sa-mobile-*` styles.
 */
export function SiteHeader() {
  const { open: openInquiry } = useInquiry();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [openSub, setOpenSub] = useState<string | null>(null);

  // Lock body scroll while the mobile drawer is open.
  useEffect(() => {
    document.body.style.overflow = drawerOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [drawerOpen]);

  return (
    <>
      <header className="sticky top-0 z-[9999] border-b border-white/[0.06] bg-[#0f1014]/[0.88] px-0 py-3.5 backdrop-blur-xl">
        <div className="mx-auto w-[min(100%-28px,1280px)]">
          <div className="flex min-h-[78px] items-center justify-between gap-6 rounded-[24px] bg-gradient-to-r from-brand to-brand-dark px-[26px] shadow-[0_16px_40px_rgba(0,0,0,0.2)] max-lg:min-h-[72px] max-lg:justify-center max-lg:rounded-none max-lg:bg-none max-lg:px-0 max-lg:shadow-none">
            {/* Logo */}
            <Link href="/" className="inline-flex items-center max-lg:-ml-2">
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
              <button
                type="button"
                onClick={openInquiry}
                className="inline-flex min-h-[54px] items-center justify-center rounded-full border border-white/25 bg-white/10 px-6 text-[15px] font-extrabold text-white transition-transform duration-200 hover:-translate-y-0.5"
              >
                Запитване
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile bottom-nav */}
      <nav className="fixed inset-x-0 bottom-0 z-[9999] hidden pb-[calc(8px+env(safe-area-inset-bottom))] max-lg:block">
        <div className="flex min-h-[74px] items-stretch justify-between border-t border-white/[0.08] bg-[#0a0b0f]/[0.92] shadow-[0_-10px_34px_rgba(0,0,0,0.28)] backdrop-blur-xl">
          <MobileTab label="Начало" href="/" icon="⌂" active />
          <MobileTab label="Автомобили" href="/vsichki-avtomobili/" icon="🚗" />
          <MobileTab label="Carfax" href="/carfax/" icon="📄" />
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            className="flex flex-1 flex-col items-center justify-center gap-1.5 px-1.5 pb-2.5 pt-2 text-[11px] font-bold text-white/60 transition-colors"
          >
            <span className="flex h-6 w-6 items-center justify-center text-xl leading-none">
              ☰
            </span>
            Меню
          </button>
        </div>
      </nav>

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
          <button
            type="button"
            onClick={() => setDrawerOpen(false)}
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/[0.08] text-white"
            aria-label="Затвори менюто"
          >
            ✕
          </button>
        </div>
        <div className="pb-[calc(22px+env(safe-area-inset-bottom))] pt-2.5">
          <ul className="m-0 list-none p-0">
            {NAV.map((item) =>
              item.children ? (
                <li
                  key={item.label}
                  className="border-b border-white/[0.06]"
                >
                  <button
                    type="button"
                    onClick={() =>
                      setOpenSub(openSub === item.label ? null : item.label)
                    }
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
                  </button>
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
            <button
              type="button"
              onClick={() => {
                setDrawerOpen(false);
                openInquiry();
              }}
              className="inline-flex min-h-[54px] w-full items-center justify-center rounded-full bg-gradient-to-r from-brand-dark to-brand px-6 text-[15px] font-extrabold text-white shadow-[0_12px_26px_rgba(216,111,22,0.24)]"
            >
              Направете запитване
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}

