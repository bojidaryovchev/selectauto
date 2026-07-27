import { RecipientsManager } from "@/components/admin/recipients";
import { requireAdminPage } from "@/lib/admin";
import { listRecipients } from "@/queries/recipients";

/**
 * /admin/poluchateli — the "Получатели" settings (contracts & payments module,
 * spec §8): the companies a payment notice can be addressed to, with their bank
 * details. SelectAuto, Auto America B.V and Lean Customs BV are seeded
 * (migration 0038); international partners are added here. Notice generation
 * blocks while a chosen recipient's bank data is incomplete. The layout gates
 * the route to admins.
 */
export default async function AdminRecipientsPage() {
  await requireAdminPage();
  const recipients = await listRecipients();

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="mb-1 text-2xl font-black tracking-tight text-ink">Получатели</h1>
        <p className="max-w-2xl text-sm text-muted">
          Фирмите и банковите данни, към които се генерират известия за плащане. SelectAuto е фиксиран получател;
          митническите брокери и международните партньори се управляват тук. Получател не се изтрива — деактивирайте
          го, за да спре да се предлага.
        </p>
      </div>
      <RecipientsManager recipients={recipients} />
    </div>
  );
}
