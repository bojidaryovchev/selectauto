import { AdminStatusTag } from "@/components/admin/ui";
import { FileTextIcon } from "@/components/icons";
import { DEPOSIT_STATUS_META, type DepositStatus } from "@/constants/contracts";
import { formatDbAmount } from "@/lib/money";
import { formatSofiaDate } from "@/lib/sofia-time";
import type { DepositListRow } from "@/queries/deposits";
import Link from "next/link";
import { DepositDocumentButton } from "./deposit-document-button";
import { DepositRowActions } from "./deposit-row-actions";

function StatusBadge({ status }: { status: string }) {
  const meta = DEPOSIT_STATUS_META[status as DepositStatus];
  if (!meta) return null;
  return <AdminStatusTag tone={meta.tone}>{meta.label}</AdminStatusTag>;
}

function UsedBy({ usedBy }: { usedBy: DepositListRow["usedBy"] }) {
  if (!usedBy) return null;
  return (
    <Link href={`/admin/dogovori/${usedBy.id}`} className="ab-used">
      <FileTextIcon />
      Използван по Договор № {usedBy.number}
    </Link>
  );
}

/** The document button and, with `deposits.manage`, the status changer. */
function Actions({ row, canManage }: { row: DepositListRow; canManage: boolean }) {
  return (
    <div className="ab-dep-acts">
      <DepositDocumentButton depositId={row.deposit.id} documents={row.documents} />
      {canManage ? (
        <DepositRowActions depositId={row.deposit.id} number={row.deposit.number} status={row.deposit.status} />
      ) : null}
    </div>
  );
}

/**
 * The deposit contracts (boards `ab-deposits` and its states; parity check docs/design/parity/admin-deposits.md) as
 * cards while the list is narrower than 56rem, two columns from 36rem, and as a table above — a container query on the
 * list's own wrapper (`ab-list`), like the contracts register. Cards carry their actions (document, status), so unlike
 * a contract card a deposit card is not one big link.
 */
export function DepositList({ rows, canManage }: { rows: DepositListRow[]; canManage: boolean }) {
  return (
    <div className="ab-list">
      <ul className="ab-cards">
        {rows.map((row) => {
          const { deposit } = row;
          return (
            <li key={deposit.id} className="ab-cc">
              <div className="ab-cc__h">
                <div>
                  <span className="ab-no text-tx">
                    Депозит № <span className="ab-mono">{deposit.number}</span>
                  </span>
                  <p className="ab-meta">{formatSofiaDate(deposit.depositDate)}</p>
                </div>
                <StatusBadge status={deposit.status} />
              </div>
              <div>
                <p className="ab-wrap font-bold">{row.clientName}</p>
                <p className="ab-meta text-tx2">
                  {deposit.vehicleDescription ?? "—"}
                  {deposit.budgetAmount
                    ? ` · Бюджет: ${formatDbAmount(deposit.budgetAmount)} ${deposit.budgetCurrency}`
                    : ""}
                </p>
              </div>
              <p className="ab-num">
                Депозит: {formatDbAmount(deposit.depositAmount)} {deposit.budgetCurrency}
              </p>
              <UsedBy usedBy={row.usedBy} />
              <Actions row={row} canManage={canManage} />
            </li>
          );
        })}
      </ul>

      <div className="ab-tbl">
        <div className="sa-tbl-wrap">
          <table className="sa-tbl">
            <thead>
              <tr>
                <th scope="col" className="w-px">
                  Депозит
                </th>
                <th scope="col">Клиент и МПС</th>
                <th scope="col" className="w-px">
                  Сума
                </th>
                <th scope="col">Статус</th>
                <th scope="col" className="w-px">
                  Действия
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const { deposit } = row;
                return (
                  <tr key={deposit.id}>
                    <td className="whitespace-nowrap">
                      <b>
                        № <span className="ab-mono">{deposit.number}</span>
                      </b>
                      <div className="ab-meta">{formatSofiaDate(deposit.depositDate)}</div>
                    </td>
                    <td className="min-w-52">
                      <div className="ab-wrap font-bold">{row.clientName}</div>
                      <div className="ab-tx2">{deposit.vehicleDescription ?? "—"}</div>
                      {deposit.budgetAmount ? (
                        <div className="ab-meta">
                          Бюджет: {formatDbAmount(deposit.budgetAmount)} {deposit.budgetCurrency}
                        </div>
                      ) : null}
                    </td>
                    <td className="ab-num">
                      {formatDbAmount(deposit.depositAmount)} {deposit.budgetCurrency}
                    </td>
                    <td>
                      <div className="ab-dep-acts">
                        <StatusBadge status={deposit.status} />
                        <UsedBy usedBy={row.usedBy} />
                      </div>
                    </td>
                    <td>
                      <Actions row={row} canManage={canManage} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
