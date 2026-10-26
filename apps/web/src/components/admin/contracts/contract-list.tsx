import {
  CONTRACT_MARKET_META,
  CONTRACT_STATUS_META,
  PAYMENT_STAGES,
  stageLabel,
  type ContractMarket,
  type ContractStatus,
} from "@/constants/contracts";
import { formatDbAmount } from "@/lib/money";
import type { ContractListRow } from "@/queries/contracts";
import Link from "next/link";
import { PaymentStatusBadge } from "./payment-status-badge";

function StatusBadge({ status }: { status: string }) {
  const meta = CONTRACT_STATUS_META[status as ContractStatus];
  if (!meta) return null;
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold whitespace-nowrap ring-1 ${meta.badgeClass}`}
    >
      {meta.label}
    </span>
  );
}

function StageChips({ row }: { row: ContractListRow }) {
  const market = row.contract.market as ContractMarket;
  return (
    <div className="flex max-w-88 flex-wrap gap-1">
      {PAYMENT_STAGES.map((stage) =>
        row.stages[stage] ? (
          <PaymentStatusBadge key={stage} status={row.stages[stage]!} prefix={stageLabel(market, stage)} />
        ) : null,
      )}
    </div>
  );
}

const marketLabel = (market: string) => CONTRACT_MARKET_META[market as ContractMarket]?.label ?? market;

/**
 * The contracts register as cards while the list is narrower than 56rem (a
 * phone, a tablet, a laptop with the sidebar), and as a table above. The switch
 * is a container query on this list's own wrapper — not on <main>, see
 * app/admin/layout.tsx.
 *
 * A card is one link: a tap anywhere opens the contract. In the table only the
 * number is a link — never a row-wide overlay on a `position: relative` <tr>:
 * Safari before 27 doesn't make a table row a containing block, so such an
 * overlay covered the whole page and any tap opened the last contract (WebKit
 * bug 240961).
 */
export function ContractList({ rows }: { rows: ContractListRow[] }) {
  return (
    <div className="@container">
      <ul className="m-0 grid list-none gap-2 p-0 @xl:grid-cols-2 @4xl:hidden">
        {rows.map((row) => {
          const { contract } = row;
          return (
            <li key={contract.id} className="min-w-0">
              <Link
                href={`/admin/dogovori/${contract.id}`}
                className="flex h-full flex-col gap-3 rounded-xl border border-line bg-white p-4 transition-colors hover:border-brand/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-bold text-brand">№ {contract.number}</p>
                    <p className="text-xs text-muted">
                      {contract.contractDate} · {marketLabel(contract.market)}
                    </p>
                  </div>
                  <StatusBadge status={contract.status} />
                </div>
                <div className="min-w-0">
                  <p className="font-semibold wrap-anywhere text-ink">{row.clientName}</p>
                  <p className="text-sm text-ink">
                    {contract.carYear} {contract.carMake} {contract.carModel}
                  </p>
                  {contract.vin ? <p className="font-mono text-xs break-all text-muted">{contract.vin}</p> : null}
                </div>
                <p className="text-sm font-bold text-ink">
                  {formatDbAmount(contract.totalAmount)} {contract.currency}
                </p>
                <StageChips row={row} />
              </Link>
            </li>
          );
        })}
      </ul>

      <div className="hidden overflow-hidden rounded-xl border border-line bg-white @4xl:block">
        <table className="w-full text-left text-sm">
          {/* `w-px` columns shrink to their content and the chips stop at 22rem,
              so the spare width goes to the client and car, which otherwise wrap. */}
          <thead className="border-b border-line text-xs tracking-wide text-muted uppercase">
            <tr>
              <th scope="col" className="w-px px-4 py-3 font-semibold">
                Договор
              </th>
              <th scope="col" className="px-4 py-3 font-semibold">
                Клиент и автомобил
              </th>
              <th scope="col" className="w-px px-4 py-3 font-semibold whitespace-nowrap">
                Обща сума
              </th>
              <th scope="col" className="px-4 py-3 font-semibold">
                Плащания
              </th>
              <th scope="col" className="w-px px-4 py-3 font-semibold">
                Статус
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const { contract } = row;
              return (
                <tr key={contract.id} className="border-b border-line align-top last:border-0 hover:bg-neutral-50">
                  <td className="px-4 py-3 whitespace-nowrap">
                    <Link href={`/admin/dogovori/${contract.id}`} className="font-bold text-brand hover:underline">
                      {contract.number}
                    </Link>
                    <div className="text-xs text-muted">{contract.contractDate}</div>
                    <div className="text-xs text-muted">{marketLabel(contract.market)}</div>
                  </td>
                  <td className="min-w-56 px-4 py-3">
                    <div className="font-semibold wrap-anywhere text-ink">{row.clientName}</div>
                    <div className="text-ink">
                      {contract.carYear} {contract.carMake} {contract.carModel}
                    </div>
                    {contract.vin ? <div className="font-mono text-xs break-all text-muted">{contract.vin}</div> : null}
                  </td>
                  <td className="px-4 py-3 font-semibold whitespace-nowrap text-ink">
                    {formatDbAmount(contract.totalAmount)} {contract.currency}
                  </td>
                  <td className="px-4 py-3">
                    <StageChips row={row} />
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <StatusBadge status={contract.status} />
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
