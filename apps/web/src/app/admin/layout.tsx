import type { Metadata } from "next";
import { Suspense } from "react";
import { auth } from "@/auth";
import { isAdmin, requireBackOfficePage } from "@/lib/admin";
import { AdminNav } from "@/components/admin";

export const metadata: Metadata = {
  title: "Админ панел | SelectAuto",
  // The owner back office — never indexed.
  robots: { index: false, follow: false },
};

/**
 * /admin layout — the owner-facing back office shell (NOT the public
 * header/footer). The static shell (nav) prerenders immediately; the gated
 * content streams inside a <Suspense> because it reads request-time auth + DB
 * (required under cacheComponents — same pattern as /lyubimi). A SINGLE boundary
 * here covers both the admin gate AND every child page's uncached data fetch, so
 * the pages don't each need their own Suspense.
 */
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#f4f4f5] text-ink">
      {/* Own boundary: usePathname() inside the nav is request-time data on
          DYNAMIC segments (/admin/dogovori/[id]) — without it the whole shell
          fails the cacheComponents prerender for those routes. */}
      <Suspense fallback={null}>
        <AdminNavForRole />
      </Suspense>
      <main className="mx-auto max-w-7xl px-4 py-6">
        <Suspense fallback={<AdminLoading />}>
          <AdminGate>{children}</AdminGate>
        </Suspense>
      </main>
    </div>
  );
}

/**
 * Gates the whole /admin tree: `requireAdminPage` redirects a signed-out visitor
 * to sign-in and a signed-in non-admin home. Runs inside the layout's <Suspense>
 * (so its `auth()` read doesn't block the static shell), and BEFORE the children
 * render — so an unauthorised request never triggers any admin query. The proxy
 * already blocks `/admin/**`; this is the per-render defence-in-depth.
 */
async function AdminGate({ children }: { children: React.ReactNode }) {
  await requireBackOfficePage();
  return <>{children}</>;
}

/**
 * The nav needs to know the role: an observer („Наблюдаващ") sees only the
 * contract/deposit sections, not the lead inboxes or the settings screens.
 */
async function AdminNavForRole() {
  const session = await auth();
  return <AdminNav isAdmin={isAdmin(session)} />;
}

function AdminLoading() {
  return <div className="py-16 text-center text-sm text-muted">Зареждане…</div>;
}
