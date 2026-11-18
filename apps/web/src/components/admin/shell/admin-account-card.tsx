"use client";

import { Button, LinkButton } from "@/components/common";
import { ArrowLeftIcon, LogOutIcon } from "@/components/icons";
import { signOut } from "next-auth/react";

/** Who is signed in, as the shell shows it: display name (or e-mail) and role label(s). */
export type AdminAccount = { name: string; role: string };

/**
 * The pinned foot of the sidebar and the drawer (boards `ad-shell-roles`, `ad-shell-phone`): the signed-in person and
 * their role, „Към сайта" and „Изход" as tonal buttons, larger in the drawer (`large`). Client component for
 * `signOut`.
 */
export function AdminAccountCard({
  account,
  large = false,
  onNavigate,
}: {
  account: AdminAccount;
  large?: boolean;
  onNavigate?: () => void;
}) {
  // First letter as an avatar; Array.from keeps a surrogate pair whole.
  const initial = Array.from(account.name.trim())[0]?.toUpperCase() ?? "?";
  const size = large ? "md" : "sm";

  return (
    <div className="ad-acc">
      <div className="ad-acc__id">
        <span className="ad-av" aria-hidden="true">
          {initial}
        </span>
        <div>
          <b>{account.name}</b>
          {account.role ? <small>{account.role}</small> : null}
        </div>
      </div>
      <div className="ad-acc__act">
        <LinkButton href="/" variant="ton" size={size} className="ad-accbtn" onClick={onNavigate}>
          <ArrowLeftIcon />
          Към сайта
        </LinkButton>
        <Button variant="ton" size={size} className="ad-accbtn" onClick={() => signOut({ redirectTo: "/" })}>
          <LogOutIcon />
          Изход
        </Button>
      </div>
    </div>
  );
}
