"use client";

import Link from "next/link";
import { signOut, useSession } from "next-auth/react";
import { Button, IconButton } from "@/components/common";
import { ChevronLeftIcon, ChevronRightIcon, DashboardIcon, HeartIcon, LogOutIcon } from "@/components/icons";
import { grantsBackOfficeAccess } from "@/constants/admin";

/**
 * The profile screen of the phone and tablet menu (board `ac-drawer`, states 7–8; `ac-drawer-tab` 2). It slides in
 * from the right over the menu drawer, with the same footprint, and its back button returns to the menu, like a
 * native app's push and pop. It shows the initial, the name (or „Профил") and the e-mail, „Админ панел" for
 * back-office roles, „Любими автомобили" and „Изход".
 *
 * `signOut` is the client next-auth call (same rationale as `UserMenu`): it updates the SessionProvider and
 * broadcasts to other tabs, so the menu flips to „Вход / Регистрация" with no reload.
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
  // Both elevated roles reach the back office — an observer sees a reduced nav there.
  const canOpenBackOffice = grantsBackOfficeAccess(user?.roles);

  return (
    <aside
      aria-label="Моят профил"
      data-theme="dark"
      aria-hidden={!open}
      inert={!open}
      className={`sa-drawer fixed right-0 top-0 z-10060 h-dvh w-[min(88vw,380px)] transition-transform duration-300 motion-reduce:transition-none lg:hidden ${
        open ? "translate-x-0" : "translate-x-full"
      }`}
    >
      <div className="sa-drawer__h justify-start gap-1.5 pl-2">
        <IconButton label="Назад към менюто" variant="ghost" onClick={onBack}>
          <ChevronLeftIcon />
        </IconButton>
        <b>Моят профил</b>
      </div>

      <div className="flex items-center gap-3.5 border-b border-hair p-5">
        <span className="sa-avatar size-11 text-base">{initial}</span>
        <div className="min-w-0">
          <b className="block text-base/snug">{user?.name || "Профил"}</b>
          {user?.email ? <span className="block truncate text-[13.5px] text-tx3">{user.email}</span> : null}
        </div>
      </div>

      <nav className="sa-drawer__nav" aria-label="Профил навигация">
        {canOpenBackOffice ? (
          <Link href="/admin" onClick={onNavigate} className="text-ortx">
            <span className="inline-flex min-w-0 items-center gap-3">
              <DashboardIcon className="text-ortx" />
              Админ панел
            </span>
            <ChevronRightIcon />
          </Link>
        ) : null}
        <Link href="/lyubimi" onClick={onNavigate}>
          <span className="inline-flex min-w-0 items-center gap-3">
            <HeartIcon />
            Любими автомобили
          </span>
          <ChevronRightIcon />
        </Link>
      </nav>

      <div className="sa-drawer__f mt-auto pb-[calc(28px+env(safe-area-inset-bottom))]">
        <Button variant="neg" block onClick={() => signOut({ redirectTo: "/" })}>
          <LogOutIcon />
          Изход
        </Button>
      </div>
    </aside>
  );
}
