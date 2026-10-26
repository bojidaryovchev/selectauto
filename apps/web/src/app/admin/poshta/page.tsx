import { MailInbox } from "@/components/admin/mail";
import { AdminPageHeader } from "@/components/admin/ui";
import { requireAdminPage } from "@/lib/admin";
import { listMailThreads } from "@/queries/mail";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Поща" };

/**
 * /admin/poshta — the info@selectauto.bg inbox.
 *
 * `requireAdminPage()` is the first statement on purpose: the /admin layout only
 * gates to BACK OFFICE level (`requirePageWith("backoffice.enter")`), so an „Наблюдаващ" would
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
    <div className="flex flex-col gap-4">
      <AdminPageHeader
        title="Поща"
        description="Съобщения до info@selectauto.bg. Отговорите се изпращат от същия адрес."
      />
      <MailInbox threads={threads} page={page} pageCount={pageCount} total={total} />
    </div>
  );
}
