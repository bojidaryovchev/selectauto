import { AdminStatusTag } from "@/components/admin/ui";
import { MakePlate } from "@/components/common";
import {
  CONTRACT_MARKET_META,
  CONTRACT_STATUS_META,
  PAYMENT_STAGES,
  stageLabel,
  type ContractMarket,
  type ContractStatus,
} from "@/constants/contracts";
import { formatDbAmount } from "@/lib/money";
import { formatSofiaDate } from "@/lib/sofia-time";
import type { ContractListRow } from "@/queries/contracts";
import Link from "next/link";
import { PaymentStatusBadge } from "./payment-status-badge";

function StatusBadge({ status }: { status: string }) {
  const meta = CONTRACT_STATUS_META[status as ContractStatus];
  if (!meta) return null;
  return <AdminStatusTag tone={meta.tone}>{meta.label}</AdminStatusTag>;
}

function StageChips({ row }: { row: ContractListRow }) {
  const market = row.contract.market as ContractMarket;
  return (
    <div className="ab-chips">
      {PAYMENT_STAGES.map((stage) =>
        row.stages[stage] ? (
          <PaymentStatusBadge key={stage} status={row.stages[stage]!} prefix={stageLabel(market, stage)} />
        ) : null,
      )}
    </div>
  );
}

/** The client, the car with its make's plate, and the VIN. */
function ClientCar({ row, logo }: { row: ContractListRow; logo: string | null }) {
  const { contract } = row;
  return (
    <>
      <p className="ab-wrap font-bold">{row.clientName}</p>
      <span className="ab-car">
        {contract.carMake ? <MakePlate name={contract.carMake} logo={logo} size="xs" /> : null}
        <span>
          <b>
            {contract.carYear} {contract.carMake} {contract.carModel}
          </b>
        </span>
      </span>
      {contract.vin ? <span className="ab-vin">{contract.vin}</span> : null}
    </>
  );
}

const marketLabel = (market: string) => CONTRACT_MARKET_META[market as ContractMarket]?.label ?? market;

/**
 * The contracts register (boards `ab-contracts`, `-sup`, `-filter`; parity check docs/design/parity/admin-contracts-list.md)
 * as cards while the list is narrower than 56rem (a phone, a tablet, a laptop with the sidebar), two columns from 36rem,
 * and as a table above. The switch is a container query on this list's own wrapper (`ab-list`) — not on <main>, see
 * app/admin/layout.tsx.
 *
 * A card is one link: a tap anywhere opens the contract. In the table only the
 * number is a link — never a row-wide overlay on a `position: relative` <tr>:
 * Safari before 27 doesn't make a table row a containing block, so such an
 * overlay covered the whole page and any tap opened the last contract (WebKit
 * bug 240961).
 */
export function ContractList({
  rows,
  makeLogos,
}: {
  rows: ContractListRow[];
  /** Each contract's make logo by contract id (decision 8); a make without one shows two letters. */
  makeLogos: Record<number, string | null>;
}) {
  return (
    <div className="ab-list">
      <ul className="ab-cards">
        {rows.map((row) => {
          const { contract } = row;
          return (
            <li key={contract.id} className="min-w-0">
              <Link href={`/admin/dogovori/${contract.id}`} className="ab-cc h-full">
                <div className="ab-cc__h">
                  <div>
                    <span className="ab-no">
                      № <span className="ab-mono">{contract.number}</span>
                    </span>
                    <p className="ab-meta">
                      {formatSofiaDate(contract.contractDate)} · {marketLabel(contract.market)}
                    </p>
                  </div>
                  <StatusBadge status={contract.status} />
                </div>
                <div>
                  <ClientCar row={row} logo={makeLogos[contract.id] ?? null} />
                </div>
                <p className="ab-num">
                  {formatDbAmount(contract.totalAmount)} {contract.currency}
                </p>
                <StageChips row={row} />
              </Link>
            </li>
          );
        })}
      </ul>

      <div className="ab-tbl">
        <div className="sa-tbl-wrap">
          <table className="sa-tbl">
            {/* `w-px` columns shrink to their content and the chips stop at 30rem,
                so the spare width goes to the client and car, which otherwise wrap. */}
            <thead>
              <tr>
                <th scope="col" className="w-px">
                  Договор
                </th>
                <th scope="col">Клиент и автомобил</th>
                <th scope="col" className="w-px">
                  Обща сума
                </th>
                <th scope="col">Плащания</th>
                <th scope="col" className="w-px">
                  Статус
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const { contract } = row;
                return (
                  <tr key={contract.id}>
                    <td className="whitespace-nowrap">
                      <Link href={`/admin/dogovori/${contract.id}`} className="ab-no">
                        <span className="ab-mono">{contract.number}</span>
                      </Link>
                      <div className="ab-meta">{formatSofiaDate(contract.contractDate)}</div>
                      <div className="ab-meta">{marketLabel(contract.market)}</div>
                    </td>
                    <td className="min-w-56">
                      <ClientCar row={row} logo={makeLogos[contract.id] ?? null} />
                    </td>
                    <td className="ab-num">
                      {formatDbAmount(contract.totalAmount)} {contract.currency}
                    </td>
                    <td>
                      <StageChips row={row} />
                    </td>
                    <td className="whitespace-nowrap">
                      <StatusBadge status={contract.status} />
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
