import { DeindexManager, DeindexRequestList } from "@/components/admin/deindex";
import { AdminPageHeader, AdminPagination } from "@/components/admin/ui";
import { requireAdminPage } from "@/lib/admin";
import { listDeindexRequests } from "@/queries/deindex";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Скрити обяви" };

/**
 * /admin/skriti-obyavi — the paid de-listing desk.
 *
 * Admin-only, explicitly: the /admin layout gates only to back-office level, and
 * this both takes money and changes what the public site shows. An „Наблюдаващ"
 * must not reach it. Boards `ab-hidden` and its states; parity check
 * docs/design/parity/admin-hidden.md.
 */
export default async function AdminDeindexPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  await requireAdminPage();
  const sp = await searchParams;
  const { rows, total, page, pageCount } = await listDeindexRequests(Number(sp.page) || 1);

  return (
    <>
      <AdminPageHeader
        title="Скрити обяви"
        description="Скриване на автомобил по заявка на собственика. Обявите връщат 410 и отпадат от каталога, картата на сайта и филтрите."
      />

      <DeindexManager />

      <section aria-labelledby="deindex-requests-title" className="ab-sec">
        <h2 id="deindex-requests-title" className="ab-h2">
          Заявки <small>({total})</small>
        </h2>
        <DeindexRequestList rows={rows} />
        <AdminPagination
          page={page}
          pageCount={pageCount}
          hrefFor={(p) => (p > 1 ? `/admin/skriti-obyavi?page=${p}` : "/admin/skriti-obyavi")}
        />
      </section>
    </>
  );
}
