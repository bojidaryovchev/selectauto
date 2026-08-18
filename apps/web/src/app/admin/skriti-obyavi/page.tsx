import { DeindexManager, DeindexRequestList } from "@/components/admin/deindex";
import { requireAdminPage } from "@/lib/admin";
import { listDeindexRequests } from "@/queries/deindex";

/**
 * /admin/skriti-obyavi — the paid de-listing desk.
 *
 * Admin-only, explicitly: the /admin layout gates only to back-office level, and
 * this both takes money and changes what the public site shows. An „Наблюдаващ"
 * must not reach it.
 *
 * The slug deliberately avoids being a prefix of any other admin route (the nav
 * highlights with `pathname.startsWith`).
 */
export default async function AdminDeindexPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  await requireAdminPage();
  const sp = await searchParams;
  const { rows, total } = await listDeindexRequests(Number(sp.page) || 1);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="mb-1 text-2xl font-black tracking-tight text-ink">Скрити обяви</h1>
        <p className="text-sm text-muted">
          Скриване на автомобил по заявка на собственика. Обявите връщат 410 и отпадат от
          каталога, картата на сайта и филтрите.
        </p>
      </div>

      <DeindexManager />

      <div>
        <h2 className="mb-2 text-lg font-black tracking-tight text-ink">
          Заявки <span className="text-sm font-semibold text-muted">({total})</span>
        </h2>
        <DeindexRequestList rows={rows} />
      </div>
    </div>
  );
}
