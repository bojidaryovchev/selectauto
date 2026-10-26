import { RecipientsManager } from "@/components/admin/recipients";
import { AdminPageHeader } from "@/components/admin/ui";
import { requireAdminPage } from "@/lib/admin";
import { listRecipients } from "@/queries/recipients";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Получатели" };

/**
 * /admin/poluchateli — the "Получатели" settings (contracts & payments module,
 * spec §8): the companies a payment notice can be addressed to, with their bank
 * details. SelectAuto, Auto America B.V and Lean Customs BV are seeded
 * (migration 0038); international partners are added here. Notice generation
 * blocks while a chosen recipient's bank data is incomplete (the cards flag it
 * beforehand). `requireAdminPage()` is the gate: the /admin layout only
 * requires back-office access.
 */
export default async function AdminRecipientsPage() {
  await requireAdminPage();
  const recipients = await listRecipients();

  return (
    <div className="flex flex-col gap-6">
      <AdminPageHeader
        title="Получатели"
        description="Фирмите и банковите данни, към които се генерират известия за плащане. SelectAuto е фиксиран получател; митническите брокери и международните партньори се управляват тук. Получател не се изтрива — деактивирайте го, за да спре да се предлага."
      />
      <RecipientsManager recipients={recipients} />
    </div>
  );
}
