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
 * header/footer): a dark sidebar from lg up, a top bar with a drawer below it,
 * and the page in the content column.
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
    <div className="min-h-dvh bg-[#f4f4f5] text-ink">
      <a
        href="#admin-main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-70 focus:rounded-lg focus:bg-white focus:px-4 focus:py-2.5 focus:text-sm focus:font-bold focus:text-ink focus:shadow-card"
      >
        Към съдържанието
      </a>
      <Suspense fallback={<AdminShellSkeleton />}>
        <AdminChrome />
      </Suspense>
      <div className="lg:pl-64">
        <main id="admin-main" tabIndex={-1} className="mx-auto w-full max-w-7xl min-w-0 px-4 py-6 outline-none lg:px-8">
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
