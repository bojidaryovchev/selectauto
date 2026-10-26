"use client";

import { ArrowLeftIcon, LogOutIcon } from "@/components/icons";
import { signOut } from "next-auth/react";
import Link from "next/link";

/** Who is signed in, as the shell shows it: display name (or e-mail) and role label(s). */
export type AdminAccount = { name: string; role: string };

// `flex-1` + nowrap: the two buttons share the row, but each is at least as
// wide as its label — in the 256 px sidebar an even split wrapped „Към сайта“.
const ACTION =
  "flex min-h-10 flex-1 items-center justify-center gap-1.5 rounded-xl px-2 text-[13px] font-semibold whitespace-nowrap text-white/75 transition-colors hover:bg-white/6 hover:text-white active:bg-white/10 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand-soft";

/**
 * The pinned footer of the sidebar and the drawer: the signed-in person and
 * their role, „Към сайта“ and „Изход“. Client component for `signOut`.
 */
export function AdminAccountCard({ account, onNavigate }: { account: AdminAccount; onNavigate?: () => void }) {
  // First letter as an avatar; Array.from keeps a surrogate pair whole.
  const initial = Array.from(account.name.trim())[0]?.toUpperCase() ?? "?";

  return (
    <div className="flex flex-col gap-2">
      <div className="flex min-w-0 items-center gap-3 px-1">
        <span
          aria-hidden="true"
          className="grid size-9 shrink-0 place-items-center rounded-full bg-white/10 text-sm font-bold text-white"
        >
          {initial}
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-bold text-white">{account.name}</p>
          {account.role && <p className="truncate text-xs text-white/55">{account.role}</p>}
        </div>
      </div>
      <div className="flex gap-1.5">
        <Link href="/" onClick={onNavigate} className={ACTION}>
          <ArrowLeftIcon className="size-4 shrink-0" />
          Към сайта
        </Link>
        <button type="button" onClick={() => signOut({ redirectTo: "/" })} className={ACTION}>
          <LogOutIcon className="size-4 shrink-0" />
          Изход
        </button>
      </div>
    </div>
  );
}
