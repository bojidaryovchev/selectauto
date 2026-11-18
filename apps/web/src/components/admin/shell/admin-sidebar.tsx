import type { AdminNavGroup } from "@/constants/admin-nav";
import { AdminAccountCard, type AdminAccount } from "./admin-account-card";
import { AdminBrand } from "./admin-brand";
import { AdminNavList } from "./admin-nav-list";

/**
 * The desktop (≥ 1024 px) navigation (board `ad-shell-roles`): a fixed, full-height column on the first surface. Brand
 * and account rows are pinned; the links between them scroll on their own when the screen is too short for all of
 * them, so the page itself never scrolls sideways or has to be scrolled to reach a link. The content column makes room
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
    <aside className="bo-side fixed inset-y-0 left-0 z-40 hidden h-dvh w-64 border-r border-hair bg-s1 lg:flex">
      <div className="bo-side__brand">
        <AdminBrand href={homeHref} />
      </div>
      <nav aria-label="Админ панел" className="bo-side__nav">
        <AdminNavList groups={groups} />
      </nav>
      <div className="bo-side__acc">
        <AdminAccountCard account={account} />
      </div>
    </aside>
  );
}
