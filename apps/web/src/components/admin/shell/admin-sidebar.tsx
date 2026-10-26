import type { AdminNavGroup } from "@/constants/admin-nav";
import { AdminAccountCard, type AdminAccount } from "./admin-account-card";
import { AdminBrand } from "./admin-brand";
import { AdminNavList } from "./admin-nav-list";

/**
 * The desktop (≥ lg) navigation: a fixed, full-height dark column. Brand and
 * account rows are pinned; the links between them scroll on their own when the
 * screen is too short for all of them, so the page itself never scrolls
 * sideways or has to be scrolled to reach a link. The content column makes room
 * with `lg:pl-64` (app/admin/layout.tsx).
 */
export function AdminSidebar({
  groups,
  homeHref,
  account,
}: {
  groups: AdminNavGroup[];
  homeHref: string;
  account: AdminAccount;
}) {
  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col bg-linear-to-b from-[#121318] to-[#0b0c10] lg:flex">
      <div className="flex h-16 shrink-0 items-center border-b border-white/8 px-5">
        <AdminBrand href={homeHref} tone="dark" />
      </div>
      <nav
        aria-label="Админ панел"
        className="min-h-0 flex-1 scrollbar-thin scrollbar-thumb-white/20 overflow-y-auto overscroll-contain px-3 py-4"
      >
        <AdminNavList groups={groups} />
      </nav>
      <div className="shrink-0 border-t border-white/8 p-3">
        <AdminAccountCard account={account} />
      </div>
    </aside>
  );
}
