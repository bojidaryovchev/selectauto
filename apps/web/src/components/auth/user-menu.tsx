"use client";

import { useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { Button, LinkButton } from "@/components/common";
import { signOutAction } from "@/mutations/auth";

/**
 * Account dropdown for a signed-in user. Shows the user's initial/avatar; the
 * menu links to favourites and signs out via the `signOutAction` server action.
 * `tone` adapts the trigger colours to the dark mobile drawer vs the orange
 * desktop pill.
 */
export function UserMenu({ tone = "light" }: { tone?: "light" | "dark" }) {
  const { data } = useSession();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  // Close on outside click.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  const user = data?.user;
  const initial = (user?.name || user?.email || "?").trim().charAt(0).toUpperCase();

  const triggerClass =
    tone === "dark"
      ? "border-white/20 bg-white/10 text-white"
      : "border-white/30 bg-white/15 text-white";

  return (
    <div ref={ref} className="relative">
      <Button
        onClick={() => setOpen((o) => !o)}
        rippleTheme="light"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Профил"
        className={`grid size-10 place-items-center rounded-full border text-sm font-black uppercase transition-transform duration-150 hover:scale-105 ${triggerClass}`}
      >
        {initial}
      </Button>

      {open ? (
        <div
          role="menu"
          className="absolute right-0 top-full z-50 mt-2 w-56 overflow-hidden rounded-2xl border border-line bg-white p-2 shadow-[0_18px_40px_rgba(0,0,0,0.16)]"
        >
          <div className="border-b border-line px-3 py-2.5">
            <p className="truncate text-sm font-bold text-ink">{user?.name || "Профил"}</p>
            {user?.email ? <p className="truncate text-xs text-muted">{user.email}</p> : null}
          </div>
          <LinkButton
            href="/lyubimi"
            onClick={() => setOpen(false)}
            role="menuitem"
            rippleTheme="dark"
            className="block rounded-xl px-3 py-2.5 text-sm font-semibold text-ink transition-colors hover:bg-brand/8 hover:text-brand-dark"
          >
            Любими автомобили
          </LinkButton>
          <form action={signOutAction}>
            <Button
              type="submit"
              role="menuitem"
              rippleTheme="dark"
              className="block w-full rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-[#b53b2f] transition-colors hover:bg-[#fff3f2]"
            >
              Изход
            </Button>
          </form>
        </div>
      ) : null}
    </div>
  );
}
