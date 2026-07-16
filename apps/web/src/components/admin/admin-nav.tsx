"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { LEAD_TYPE_META, LEAD_TYPES } from "@/constants/admin";

/**
 * Admin back-office top navigation. Client component (active link via
 * usePathname). Links: dashboard + one inbox per lead type + sign-out. Rendered
 * by the admin layout, which already gates the whole /admin tree to admins.
 */
export function AdminNav() {
  const pathname = usePathname();

  const links = [
    { href: "/admin", label: "Табло" },
    ...LEAD_TYPES.map((t) => ({ href: LEAD_TYPE_META[t].href, label: LEAD_TYPE_META[t].short })),
  ];

  return (
    <header className="sticky top-0 z-30 border-b border-line bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-7xl items-center gap-1 px-4">
        <Link href="/admin" className="mr-3 text-sm font-black uppercase tracking-tight text-ink">
          SelectAuto <span className="text-brand">Админ</span>
        </Link>
        <nav className="flex items-center gap-1">
          {links.map((l) => {
            const active = l.href === "/admin" ? pathname === "/admin" : pathname.startsWith(l.href);
            return (
              <Link
                key={l.href}
                href={l.href}
                className={`rounded-full px-3 py-1.5 text-sm font-semibold transition-colors ${
                  active ? "bg-brand/10 text-brand" : "text-muted hover:bg-neutral-100 hover:text-ink"
                }`}
              >
                {l.label}
              </Link>
            );
          })}
        </nav>
        <button
          type="button"
          onClick={() => signOut({ callbackUrl: "/" })}
          className="ml-auto rounded-full px-3 py-1.5 text-sm font-semibold text-muted transition-colors hover:bg-neutral-100 hover:text-ink"
        >
          Изход
        </button>
      </div>
    </header>
  );
}
