import { DEPOSIT_STATUS_META, type DepositStatus } from "@/constants/contracts";
import { formatDbAmount } from "@/lib/money";
import type { DepositListRow } from "@/queries/deposits";
import Link from "next/link";
import { DepositDocumentButton } from "./deposit-document-button";
import { DepositRowActions } from "./deposit-row-actions";

function StatusBadge({ status }: { status: string }) {
  const meta = DEPOSIT_STATUS_META[status as DepositStatus];
  if (!meta) return null;
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold whitespace-nowrap ring-1 ${meta.badgeClass}`}
    >
      {meta.label}
    </span>
  );
}

function UsedBy({ usedBy }: { usedBy: DepositListRow["usedBy"] }) {
  if (!usedBy) return null;
  return (
    <Link
      href={`/admin/dogovori/${usedBy.id}`}
      className="-my-2.5 inline-block py-2.5 text-sm font-semibold text-brand hover:underline"
    >
      Използван по Договор № {usedBy.number}
    </Link>
  );
}

/** The document button and, with `deposits.manage`, the status changer. */
function Actions({ row, canManage }: { row: DepositListRow; canManage: boolean }) {
  return (
    <div className="flex flex-col items-start gap-2">
      <DepositDocumentButton depositId={row.deposit.id} documents={row.documents} />
      {canManage ? (
        <DepositRowActions depositId={row.deposit.id} number={row.deposit.number} status={row.deposit.status} />
      ) : null}
    </div>
  );
}

/**
 * The deposit contracts as cards while the list is narrower than 56rem, and as
 * a table above — a container query on the list's own wrapper, like the
 * contracts register. Cards carry their actions (document, status), so unlike a
 * contract card a deposit card is not one big link.
 */
export function DepositList({ rows, canManage }: { rows: DepositListRow[]; canManage: boolean }) {
  return (
    <div className="@container">
      <ul className="m-0 grid list-none gap-2 p-0 @xl:grid-cols-2 @4xl:hidden">
        {rows.map((row) => {
          const { deposit } = row;
          return (
            <li key={deposit.id} className="flex min-w-0 flex-col gap-3 rounded-xl border border-line bg-white p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-bold text-ink">Депозит № {deposit.number}</p>
                  <p className="text-xs text-muted">{deposit.depositDate}</p>
                </div>
                <StatusBadge status={deposit.status} />
              </div>
              <div className="min-w-0 text-sm">
                <p className="font-semibold wrap-anywhere text-ink">{row.clientName}</p>
                <p className="text-muted">
                  {deposit.vehicleDescription ?? "—"}
                  {deposit.budgetAmount
                    ? ` · Бюджет: ${formatDbAmount(deposit.budgetAmount)} ${deposit.budgetCurrency}`
                    : ""}
                </p>
              </div>
              <p className="text-sm font-bold text-ink">
                Депозит: {formatDbAmount(deposit.depositAmount)} {deposit.budgetCurrency}
              </p>
              <UsedBy usedBy={row.usedBy} />
              <Actions row={row} canManage={canManage} />
            </li>
          );
        })}
      </ul>

      <div className="hidden overflow-hidden rounded-xl border border-line bg-white @4xl:block">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-line text-xs tracking-wide text-muted uppercase">
            <tr>
              <th scope="col" className="w-px px-4 py-3 font-semibold">
                Депозит
              </th>
              <th scope="col" className="px-4 py-3 font-semibold">
                Клиент и МПС
              </th>
              <th scope="col" className="w-px px-4 py-3 font-semibold">
                Сума
              </th>
              <th scope="col" className="px-4 py-3 font-semibold">
                Статус
              </th>
              <th scope="col" className="w-px px-4 py-3 font-semibold">
                Действия
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const { deposit } = row;
              return (
                <tr key={deposit.id} className="border-b border-line align-top last:border-0">
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className="font-bold text-ink">№ {deposit.number}</span>
                    <div className="text-xs text-muted">{deposit.depositDate}</div>
                  </td>
                  <td className="min-w-56 px-4 py-3">
                    <div className="font-semibold wrap-anywhere text-ink">{row.clientName}</div>
                    <div className="text-muted">{deposit.vehicleDescription ?? "—"}</div>
                    {deposit.budgetAmount ? (
                      <div className="text-xs text-muted">
                        Бюджет: {formatDbAmount(deposit.budgetAmount)} {deposit.budgetCurrency}
                      </div>
                    ) : null}
                  </td>
                  <td className="px-4 py-3 font-semibold whitespace-nowrap text-ink">
                    {formatDbAmount(deposit.depositAmount)} {deposit.budgetCurrency}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-col items-start gap-1">
                      <StatusBadge status={deposit.status} />
                      <UsedBy usedBy={row.usedBy} />
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <Actions row={row} canManage={canManage} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
