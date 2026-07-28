import Link from "next/link";
import { auth } from "@/auth";
import { NumberingSettings } from "@/components/admin/contracts";
import { DepositDocumentButton, DepositForm, DepositRowActions } from "@/components/admin/deposits";
import { DEPOSIT_STATUS_META, type DepositStatus } from "@/constants/contracts";
import { isAdmin } from "@/lib/admin";
import { formatDbAmount } from "@/lib/money";
import { listClients } from "@/queries/clients";
import { getNumbering } from "@/queries/contracts";
import { listDeposits } from "@/queries/deposits";

/**
 * /admin/depoziti — the deposit-contracts module (spec §14): independent number
 * series, own lifecycle (Чернова → Подписан → Депозит платен → Използван /
 * Върнат / Анулиран). A 'paid' deposit becomes offerable in the contract
 * wizard; contract creation flips it to 'used' and links it (visible in the
 * "Използван по" column). The layout gates the route to admins.
 */
export default async function AdminDepositsPage() {
  const [deposits, clients, session] = await Promise.all([listDeposits(), listClients(), auth()]);
  // „Наблюдаващ" may create deposits but not move them through the lifecycle,
  // and never sees the numbering setting.
  const canManage = isAdmin(session);
  const numbering = canManage ? await getNumbering("deposit") : null;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="mb-1 text-2xl font-black tracking-tight text-ink">Договори за депозит</h1>
        <p className="max-w-2xl text-sm text-muted">
          Депозит със статус „Депозит платен“ се предлага автоматично за приспадане при създаване на договор за
          посредничество за същия клиент. Използван депозит не може да се променя или ползва повторно.
        </p>
      </div>

      {numbering ? <NumberingSettings numbering={numbering} /> : null}

      <div className="overflow-x-auto rounded-xl border border-line bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-line text-xs uppercase tracking-wide text-muted">
            <tr>
              <th className="px-4 py-3 font-semibold">№ / Дата</th>
              <th className="px-4 py-3 font-semibold">Клиент</th>
              <th className="px-4 py-3 font-semibold">МПС / Бюджет</th>
              <th className="px-4 py-3 font-semibold">Депозит</th>
              <th className="px-4 py-3 font-semibold">Статус</th>
              <th className="px-4 py-3 font-semibold">Използван по</th>
              <th className="px-4 py-3 font-semibold">Договор</th>
              <th className="px-4 py-3 font-semibold">Промяна</th>
            </tr>
          </thead>
          <tbody>
            {deposits.map(({ deposit, clientName, usedBy, documents }) => {
              const meta = DEPOSIT_STATUS_META[deposit.status as DepositStatus];
              return (
                <tr key={deposit.id} className="border-b border-line align-top last:border-0 hover:bg-neutral-50">
                  <td className="whitespace-nowrap px-4 py-3">
                    <span className="font-bold text-ink">Депозит № {deposit.number}</span>
                    <div className="text-xs text-muted">{deposit.depositDate}</div>
                  </td>
                  <td className="px-4 py-3 font-semibold text-ink">{clientName}</td>
                  <td className="px-4 py-3 text-muted">
                    {deposit.vehicleDescription ?? "—"}
                    {deposit.budgetAmount ? (
                      <div className="text-xs">
                        Бюджет: {formatDbAmount(deposit.budgetAmount)} {deposit.budgetCurrency}
                      </div>
                    ) : null}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 font-semibold text-ink">
                    {formatDbAmount(deposit.depositAmount)} {deposit.budgetCurrency}
                  </td>
                  <td className="px-4 py-3">
                    {meta ? (
                      <span className={`whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-bold ring-1 ${meta.badgeClass}`}>
                        {meta.label}
                      </span>
                    ) : null}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3">
                    {usedBy ? (
                      <Link href={`/admin/dogovori/${usedBy.id}`} className="font-semibold text-brand hover:underline">
                        Договор № {usedBy.number}
                      </Link>
                    ) : (
                      <span className="text-muted">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {canManage ? (
                      <DepositDocumentButton depositId={deposit.id} documents={documents} />
                    ) : (
                      <span className="text-xs text-muted">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {canManage ? (
                      <DepositRowActions depositId={deposit.id} status={deposit.status} />
                    ) : (
                      <span className="text-xs text-muted">—</span>
                    )}
                  </td>
                </tr>
              );
            })}
            {deposits.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-sm text-muted">
                  Още няма договори за депозит.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <DepositForm clients={clients} />
    </div>
  );
}
