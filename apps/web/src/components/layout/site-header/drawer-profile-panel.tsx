"use client";

import { signOut, useSession } from "next-auth/react";
import { Button, LinkButton } from "@/components/common";
import { ChevronLeftIcon, ChevronRightIcon, HeartIcon, ShieldIcon } from "@/components/icons";

/**
 * App-style profile sub-screen for the mobile drawer. Slides in from the right
 * *over* the main menu drawer (same footprint, higher z-index) and is topped by
 * a back button that returns to the menu — mirroring a native mobile app's
 * push/pop navigation.
 *
 * This replaces the old `UserMenu` dropdown that was reused inside the drawer:
 * that dropdown is an `absolute right-0 w-56` popover, and dropped into the
 * narrow, `overflow-y-auto` drawer it rendered partially outside the panel's
 * clip box and appeared cut off. A full slide-in screen has no such clipping.
 *
 * `useSession`/`signOut` are the client next-auth calls (same rationale as
 * `UserMenu`): the client `signOut` updates the SessionProvider + broadcasts to
 * other tabs so the header flips to "Вход" with no reload.
 */
interface Props {
  /** Whether the profile screen is showing (slid in over the drawer). */
  open: boolean;
  /** Return to the menu drawer (pop this screen), leaving the drawer open. */
  onBack: () => void;
  /** Close the whole drawer — used after tapping a link that navigates away. */
  onNavigate: () => void;
}

export function DrawerProfilePanel({ open, onBack, onNavigate }: Props) {
  const { data } = useSession();
  const user = data?.user;
  const initial = (user?.name || user?.email || "?").trim().charAt(0).toUpperCase();
  const isAdmin = user?.roles?.includes("admin") ?? false;

  return (
    <aside
      aria-label="Моят профил"
      aria-hidden={!open}
      className={`fixed right-0 top-0 z-10060 flex h-dvh w-[min(88vw,380px)] flex-col overflow-y-auto bg-linear-to-b from-[#121318] to-[#0b0c10] transition-transform duration-300 lg:hidden ${
        open ? "translate-x-0 shadow-[-12px_0_40px_rgba(0,0,0,0.28)]" : "translate-x-full"
      }`}
    >
      {/* Sticky top bar with a back control, covering the drawer's own header. */}
      <div className="sticky top-0 z-2 flex items-center gap-3 border-b border-white/8 bg-[#121318]/94 px-3 py-4.5 backdrop-blur-md">
        <Button
          onClick={onBack}
          rippleTheme="light"
          aria-label="Назад към менюто"
          className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-white/8 text-white"
        >
          <ChevronLeftIcon className="size-5" />
        </Button>
        <p className="m-0 text-sm font-extrabold uppercase tracking-[0.08em] text-white">Моят профил</p>
      </div>

      {/* Identity card. */}
      <div className="flex items-center gap-3 border-b border-white/6 px-4.5 py-5">
        <span className="grid size-11 shrink-0 place-items-center rounded-full border border-white/20 bg-white/10 text-base font-black uppercase text-white">
          {initial}
        </span>
        <div className="min-w-0">
          <p className="truncate text-[15px] font-bold text-white">{user?.name || "Профил"}</p>
          {user?.email ? <p className="truncate text-xs text-white/55">{user.email}</p> : null}
        </div>
      </div>

      {/* Profile actions as full-width rows. */}
      <nav aria-label="Профил навигация">
        <ul className="m-0 list-none p-0">
          {isAdmin ? (
            <li className="border-b border-white/6">
              <LinkButton
                href="/admin"
                rippleTheme="light"
                onClick={onNavigate}
                className="flex min-h-14 items-center gap-3 px-4.5 text-[15px] font-bold text-brand-soft"
              >
                <ShieldIcon className="size-5 shrink-0 text-brand-soft" />
                <span className="flex-1">Админ панел</span>
                <ChevronRightIcon className="size-4 shrink-0 text-white/45" />
              </LinkButton>
            </li>
          ) : null}
          <li className="border-b border-white/6">
            <LinkButton
              href="/lyubimi"
              rippleTheme="light"
              onClick={onNavigate}
              className="flex min-h-14 items-center gap-3 px-4.5 text-[15px] font-bold text-[#f2f3f5]"
            >
              <HeartIcon className="size-5 shrink-0 text-brand-soft" />
              <span className="flex-1">Любими автомобили</span>
              <ChevronRightIcon className="size-4 shrink-0 text-white/45" />
            </LinkButton>
          </li>
        </ul>
      </nav>

      {/* Sign out, pinned to the bottom of the screen. */}
      <div className="mt-auto px-4.5 pb-[calc(22px+env(safe-area-inset-bottom))] pt-6">
        <Button
          type="button"
          onClick={() => signOut({ redirectTo: "/" })}
          rippleTheme="light"
          className="inline-flex min-h-13.5 w-full items-center justify-center rounded-full border border-[#b53b2f]/40 bg-[#b53b2f]/12 px-6 text-[15px] font-extrabold text-[#ff8f83]"
        >
          Изход
        </Button>
      </div>
    </aside>
  );
}
