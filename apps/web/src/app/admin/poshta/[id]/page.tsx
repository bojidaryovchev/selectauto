import { notFound } from "next/navigation";
import { MailThreadView } from "@/components/admin/mail";
import { requireAdminPage } from "@/lib/admin";
import { getMailThread } from "@/queries/mail";

/**
 * /admin/poshta/[id] — one conversation, with the reply composer.
 *
 * A dedicated page rather than a drawer (the lead inbox's pattern): a thread
 * plus a composer needs the room, and this gives two admins a URL they can send
 * each other. Admin-only for the same reason as the list — see `poshta/page.tsx`.
 *
 * Note this page is where missing message bodies get pulled from Resend (see
 * `getMailThread`), so it can be slower on first open of an old thread.
 */
export default async function AdminMailThreadPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdminPage();
  const { id } = await params;

  const threadId = Number(id);
  if (!Number.isInteger(threadId) || threadId <= 0) notFound();

  const thread = await getMailThread(threadId);
  if (!thread) notFound();

  return <MailThreadView thread={thread} />;
}
