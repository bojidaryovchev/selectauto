import { auth } from "@/auth";
import { NumberingSettings } from "@/components/admin/contracts";
import { DepositForm, DepositList } from "@/components/admin/deposits";
import { AdminEmptyState, AdminPageHeader } from "@/components/admin/ui";
import { ChevronDownIcon } from "@/components/icons";
import { can } from "@/lib/admin";
import { listClients } from "@/queries/clients";
import { getNumbering } from "@/queries/contracts";
import { listDeposits } from "@/queries/deposits";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Депозити" };

/**
 * /admin/depoziti — the deposit-contracts module (spec §14): independent number
 * series, own lifecycle (Чернова → Подписан → Депозит платен → Използван /
 * Върнат / Анулиран). A 'paid' deposit becomes offerable in the contract
 * wizard; contract creation flips it to 'used' and links it („Използван по").
 * The layout gates the route to the back office, and listDeposits shows only
 * the deposits the user may see.
 */
export default async function AdminDepositsPage() {
  const session = await auth();
  // „Наблюдаващ" may create and print deposits but not move them through the
  // lifecycle (`deposits.manage`), and never sees the numbering setting
  // (`contracts.edit`).
  const canCreate = can(session, "contracts.create");
  const canManage = can(session, "deposits.manage");
  const [deposits, clients, numbering] = await Promise.all([
    listDeposits(),
    canCreate ? listClients() : [],
    can(session, "contracts.edit") ? getNumbering("deposit") : null,
  ]);

  return (
    <div className="flex flex-col gap-4">
      <AdminPageHeader
        title="Договори за депозит"
        description="Депозит със статус „Депозит платен“ се предлага автоматично за приспадане при създаване на договор за същия клиент. Използван депозит не може да се променя или ползва повторно."
      />

      {numbering ? <NumberingSettings numbering={numbering} /> : null}

      {/* The form opens here, above the list — at the bottom of a long list it
          was a long scroll away on a phone. Open from the start while there is
          nothing in the list. */}
      {canCreate ? (
        <details open={deposits.length === 0} className="group rounded-xl border border-line bg-white">
          <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-3 px-4 text-base font-black text-ink select-none sm:px-5 [&::-webkit-details-marker]:hidden">
            ＋ Нов договор за депозит
            <ChevronDownIcon className="size-4 shrink-0 transition-transform group-open:rotate-180" />
          </summary>
          <div className="border-t border-line p-4 sm:p-5">
            <DepositForm clients={clients} />
          </div>
        </details>
      ) : null}

      {deposits.length > 0 ? (
        <DepositList rows={deposits} canManage={canManage} />
      ) : (
        <AdminEmptyState title="Още няма договори за депозит." />
      )}
    </div>
  );
}
