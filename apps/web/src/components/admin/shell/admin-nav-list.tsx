"use client";

import { isAdminNavActive, type AdminNavGroup } from "@/constants/admin-nav";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useId } from "react";
import { AdminNavIcon } from "./admin-nav-icon";

/**
 * The grouped section links, on the dark surface of both the desktop sidebar
 * and the mobile drawer. Client component: the active link comes from
 * usePathname. `onNavigate` lets the drawer close itself on a tap — the admin
 * layout stays mounted across navigations, so it would otherwise stay open over
 * the new page.
 */
export function AdminNavList({ groups, onNavigate }: { groups: AdminNavGroup[]; onNavigate?: () => void }) {
  const pathname = usePathname();
  // Both renderers can be in the DOM at once (the sidebar is only hidden by CSS
  // below lg), so the group headings need ids unique per list.
  const id = useId();

  return (
    <div className="flex flex-col gap-4">
      {groups.map((group, index) => {
        const headingId = `${id}-group-${index}`;
        return (
          <div key={group.label ?? "home"}>
            {group.label && (
              <p
                id={headingId}
                className="mb-1.5 px-3 text-[11px] font-extrabold tracking-[0.12em] text-white/40 uppercase"
              >
                {group.label}
              </p>
            )}
            <ul
              aria-labelledby={group.label ? headingId : undefined}
              className="m-0 flex list-none flex-col gap-0.5 p-0"
            >
              {group.items.map((item) => {
                const active = isAdminNavActive(pathname, item.href);
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={onNavigate}
                      aria-current={active ? "page" : undefined}
                      className={`relative flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand-soft lg:min-h-10 ${
                        active
                          ? "bg-brand/15 text-brand-soft"
                          : "text-white/75 hover:bg-white/6 hover:text-white active:bg-white/10"
                      }`}
                    >
                      {/* Left accent in the gutter, flush with the panel's edge —
                          the public drawer's active-row marker. Absolutely placed,
                          so the label never shifts. */}
                      <span
                        aria-hidden="true"
                        className={`absolute inset-y-1.5 -left-3 w-1 rounded-r-full ${
                          active ? "bg-brand-soft" : "bg-transparent"
                        }`}
                      />
                      <AdminNavIcon name={item.icon} className="size-5 shrink-0" />
                      <span className="min-w-0 truncate">{item.label}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}
    </div>
  );
}
