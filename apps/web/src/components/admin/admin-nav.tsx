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
export function AdminNav({ isAdmin = true }: { isAdmin?: boolean }) {
  const pathname = usePathname();

  // „Наблюдаващ" only works with contracts and deposits; leads, tariffs and the
  // recipient settings are admin-only (the pages re-check server-side).
  const links = isAdmin
    ? [
        { href: "/admin", label: "Табло" },
        ...LEAD_TYPES.map((t) => ({ href: LEAD_TYPE_META[t].href, label: LEAD_TYPE_META[t].short })),
        { href: "/admin/dogovori", label: "Договори" },
        { href: "/admin/depoziti", label: "Депозити" },
        { href: "/admin/tarifi", label: "Тарифи" },
        { href: "/admin/poluchateli", label: "Получатели" },
        { href: "/admin/potrebiteli", label: "Потребители" },
      ]
    : [
        { href: "/admin/dogovori", label: "Договори" },
        { href: "/admin/depoziti", label: "Депозити" },
      ];

  const renderLinks = () =>
    links.map((l) => {
      const active = l.href === "/admin" ? pathname === "/admin" : pathname.startsWith(l.href);
      return (
        <Link
          key={l.href}
          href={l.href}
          className={`shrink-0 whitespace-nowrap rounded-full px-3 py-1.5 text-sm font-semibold transition-colors ${
            active ? "bg-brand/10 text-brand" : "text-muted hover:bg-neutral-100 hover:text-ink"
          }`}
        >
          {l.label}
        </Link>
      );
    });

  return (
    <header className="sticky top-0 z-30 border-b border-line bg-white/95 backdrop-blur-sm">
      <div className="mx-auto max-w-7xl px-4">
        {/* Top row: logo + (desktop-only inline nav) + right actions. */}
        <div className="flex h-14 items-center gap-2">
          <Link
            href="/admin"
            className="shrink-0 text-sm font-black uppercase tracking-tight text-ink"
          >
            SelectAuto <span className="text-brand">Админ</span>
          </Link>
          <nav className="hidden items-center gap-1 md:flex">{renderLinks()}</nav>
          <div className="ml-auto flex shrink-0 items-center gap-1">
            <Link
              href="/"
              className="rounded-full px-2.5 py-1.5 text-sm font-semibold text-muted transition-colors hover:bg-neutral-100 hover:text-ink sm:px-3"
            >
              <span className="hidden sm:inline">← Към сайта</span>
              <span className="sm:hidden">← Сайт</span>
            </Link>
            <button
              type="button"
              onClick={() => signOut({ callbackUrl: "/" })}
              className="rounded-full px-2.5 py-1.5 text-sm font-semibold text-muted transition-colors hover:bg-neutral-100 hover:text-ink sm:px-3"
            >
              Изход
            </button>
          </div>
        </div>

        {/* Second row on mobile: horizontally scrollable section links. */}
        <nav className="-mx-1 flex items-center gap-1 overflow-x-auto px-1 pb-2 md:hidden">
          {renderLinks()}
        </nav>
      </div>
    </header>
  );
}
