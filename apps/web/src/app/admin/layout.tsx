import { AdminChrome, AdminPageSkeleton, AdminShellSkeleton } from "@/components/admin/shell";
import { requirePageWith } from "@/lib/admin";
import type { Metadata } from "next";
import { Suspense } from "react";

export const metadata: Metadata = {
  // Each admin page sets a short title of its own („Договори“ →
  // „Договори · Админ · SelectAuto“), so open tabs can be told apart.
  title: { template: "%s · Админ · SelectAuto", default: "Админ панел · SelectAuto" },
  // The owner back office — never indexed.
  robots: { index: false, follow: false },
};

/**
 * /admin layout — the owner-facing back office shell (NOT the public
 * header/footer; boards `ad-shell-roles`, `ad-shell-phone`, parity check docs/design/parity/admin-shell.md): the
 * sidebar from lg up, the kit's top bar with a drawer below it, and the page in the content column, on the night
 * ground.
 *
 * Two <Suspense> boundaries, because both halves read request-time auth (which
 * cacheComponents requires to sit inside one): the chrome, whose skeleton has
 * the same geometry, and the gated content. The latter covers the admin gate
 * AND, on a first load, every child page's uncached data fetch; on navigation
 * between admin pages this layout doesn't re-render, and loading.tsx shows the
 * placeholder instead.
 *
 * The window stays the scroller (no inner scrolling <main>): ScrollToTop, the
 * dialogs' scroll lock and mobile browser behaviour all assume it. Don't give
 * <main> or its ancestors a transform, filter or containment (`@container`
 * included) — the lead inboxes' detail drawer is `fixed` and not portaled, and
 * any of those would trap it inside the content column.
 */
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh">
      {/* „Към съдържанието": hidden until a keyboard focuses it (board `ad-shell-phone` 5). */}
      <a
        href="#admin-main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2.5 focus:left-3 focus:z-70 focus:inline-flex focus:h-11 focus:items-center focus:rounded-md focus:bg-tx focus:px-4 focus:text-sm focus:font-extrabold focus:text-bg"
      >
        Към съдържанието
      </a>
      <Suspense fallback={<AdminShellSkeleton />}>
        <AdminChrome />
      </Suspense>
      <div className="lg:pl-64">
        <main id="admin-main" tabIndex={-1} className="ad-main outline-none">
          <Suspense fallback={<AdminPageSkeleton />}>
            <AdminGate>{children}</AdminGate>
          </Suspense>
        </main>
      </div>
    </div>
  );
}

/**
 * Gates the whole /admin tree at BACK-OFFICE level (`backoffice.enter`): a
 * signed-out visitor goes to sign-in, anyone without back-office access home.
 * Admin-only pages still call `requireAdminPage` themselves. Runs inside the
 * layout's <Suspense> (so its `auth()` read doesn't block the static shell), and
 * BEFORE the children render — so an unauthorised request never triggers any
 * admin query. The proxy already blocks `/admin/**`; this is the per-render
 * defence-in-depth.
 */
async function AdminGate({ children }: { children: React.ReactNode }) {
  await requirePageWith("backoffice.enter");
  return <>{children}</>;
}
