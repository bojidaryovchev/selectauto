"use client";

import { isAdminNavActive, type AdminNavGroup } from "@/constants/admin-nav";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useId } from "react";
import { AdminNavIcon } from "./admin-nav-icon";

/**
 * The grouped section links of the desktop sidebar and the phone drawer (boards `ad-shell-roles`, `ad-shell-phone`):
 * the kit's rows with their icons, the current one marked. `large` is the drawer's 48 px rows. Client component: the
 * active link comes from usePathname. `onNavigate` lets the drawer close itself on a tap — the admin layout stays
 * mounted across navigations, so it would otherwise stay open over the new page.
 */
export function AdminNavList({
  groups,
  large = false,
  onNavigate,
}: {
  groups: AdminNavGroup[];
  large?: boolean;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  // Both renderers can be in the DOM at once (the sidebar is only hidden by CSS
  // below lg), so the group headings need ids unique per list.
  const id = useId();

  return (
    <div className={`bo-nav ${large ? "bo-nav--lg" : ""}`}>
      {groups.map((group, index) => {
        const headingId = `${id}-group-${index}`;
        return (
          <div key={group.label ?? "home"} className="bo-nav__g">
            {group.label ? <p id={headingId}>{group.label}</p> : null}
            <ul aria-labelledby={group.label ? headingId : undefined}>
              {group.items.map((item) => {
                const active = isAdminNavActive(pathname, item.href);
                return (
                  <li key={item.href}>
                    <Link href={item.href} onClick={onNavigate} aria-current={active ? "page" : undefined}>
                      <AdminNavIcon name={item.icon} />
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
