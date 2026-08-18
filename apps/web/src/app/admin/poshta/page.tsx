import { MailInbox } from "@/components/admin/mail";
import { requireAdminPage } from "@/lib/admin";
import { listMailThreads } from "@/queries/mail";

/**
 * /admin/poshta — the info@selectauto.bg inbox.
 *
 * `requireAdminPage()` is the first statement on purpose: the /admin layout only
 * gates to BACK OFFICE level (`requireBackOfficePage`), so an „Наблюдаващ" would
 * otherwise reach customer correspondence. Reading and answering mail on behalf
 * of the business is admin-only.
 */
export default async function AdminMailPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; status?: string; q?: string; unread?: string }>;
}) {
  await requireAdminPage();
  const sp = await searchParams;

  const { threads, total, page, pageCount } = await listMailThreads({
    page: Number(sp.page) || 1,
    status: sp.status,
    q: sp.q,
    unreadOnly: sp.unread === "1",
  });

  return (
    <div>
      <h1 className="mb-1 text-2xl font-black tracking-tight text-ink">Поща</h1>
      <p className="mb-4 text-sm text-muted">
        Съобщения до info@selectauto.bg. Отговорите се изпращат от същия адрес.
      </p>
      <MailInbox threads={threads} page={page} pageCount={pageCount} total={total} />
    </div>
  );
}
