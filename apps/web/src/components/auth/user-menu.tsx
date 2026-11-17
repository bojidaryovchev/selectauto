"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { signOut, useSession } from "next-auth/react";
import { DashboardIcon, HeartIcon, LogOutIcon } from "@/components/icons";
import { grantsBackOfficeAccess } from "@/constants/admin";

/**
 * The desktop header's account menu for a signed-in user (board `ac-hdr`, states 6–10): the initial of the name (or
 * the e-mail) on a round avatar opens the menu with the name or „Профил", the e-mail, „Админ панел" for back-office
 * roles, „Любими автомобили" and „Изход".
 *
 * It signs out with the client `signOut` from next-auth/react, NOT a Server Action: the client call updates the
 * SessionProvider and broadcasts to other tabs, so the header flips to „Вход" without a reload. A Server Action would
 * clear the cookie but leave the cached client session "authenticated".
 *
 * Closes on a press outside, on Esc (focus returns to the avatar) and after choosing a link.
 */
export function UserMenu() {
  const { data } = useSession();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setOpen(false);
      triggerRef.current?.focus();
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const user = data?.user;
  const initial = (user?.name || user?.email || "?").trim().charAt(0).toUpperCase();
  // Both elevated roles reach the back office — an observer sees a reduced nav there.
  const canOpenBackOffice = grantsBackOfficeAccess(user?.roles);

  return (
    <div ref={ref} className="relative flex">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Профил"
        className="sa-avatar cursor-pointer border-0 aria-expanded:shadow-[inset_0_0_0_2px_var(--color-or)]"
      >
        {initial}
      </button>

      {open ? (
        <div role="menu" aria-label="Профил" className="sa-menu absolute right-0 top-[calc(100%+16px)] z-60 w-68">
          <div className="sa-menu__id">
            <b className="truncate">{user?.name || "Профил"}</b>
            {user?.email ? <span className="block truncate">{user.email}</span> : null}
          </div>
          {canOpenBackOffice ? (
            <Link href="/admin" role="menuitem" className="is-or" onClick={() => setOpen(false)}>
              <DashboardIcon />
              Админ панел
            </Link>
          ) : null}
          <Link href="/lyubimi" role="menuitem" onClick={() => setOpen(false)}>
            <HeartIcon />
            Любими автомобили
          </Link>
          <button type="button" role="menuitem" className="is-neg" onClick={() => signOut({ redirectTo: "/" })}>
            <LogOutIcon />
            Изход
          </button>
        </div>
      ) : null}
    </div>
  );
}
