import type { Metadata } from "next";
import { requireAdminPage } from "@/lib/admin";
import { AdminNav } from "@/components/admin";

export const metadata: Metadata = {
  title: "Админ панел | SelectAuto",
  // The owner back office — never indexed.
  robots: { index: false, follow: false },
};

/**
 * /admin layout — the owner-facing back office shell (NOT the public
 * header/footer). Gates the WHOLE tree: `requireAdminPage` redirects a signed-out
 * visitor to sign-in and a signed-in non-admin home. The proxy already blocks
 * `/admin/**`; this is the per-render defence-in-depth (the repo gates per-action,
 * not by route alone). Runs on every admin navigation, so each page inherits the
 * gate without repeating it.
 */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdminPage();

  return (
    <div className="min-h-screen bg-[#f4f4f5] text-ink">
      <AdminNav />
      <main className="mx-auto max-w-7xl px-4 py-6">{children}</main>
    </div>
  );
}
