import { AdminEmptyState } from "@/components/admin/ui";
import { formatSofiaDate } from "@/lib/sofia-time";
import type { DeindexRequestRow } from "@/queries/deindex";

/**
 * The de-listing register — a plain server component (no interactivity). Cards
 * below the table's container width, a table above it.
 *
 * For a paid service this list IS the audit trail: who asked, what proof was
 * recorded, what was charged and by whom, and whether the suppression is still
 * in force. `Обяви` is resolved live from the VIN (hidden / all), so a mismatch
 * shows at once — that is what a re-ingested vehicle whose new row was never
 * stamped looks like.
 */
export function DeindexRequestList({ rows }: { rows: DeindexRequestRow[] }) {
  if (rows.length === 0) return <AdminEmptyState title="Няма заявки за скриване." />;

  return (
    <div className="@container">
      <ul className="m-0 flex list-none flex-col gap-2 p-0 @4xl:hidden">
        {rows.map((r) => (
          <li key={r.id} className="flex flex-col gap-2 rounded-xl border border-line bg-white p-4 text-sm">
            <div className="flex items-start justify-between gap-3">
              <span className="font-bold wrap-anywhere text-ink">{r.vinNormalized}</span>
              <State row={r} />
            </div>
            <dl className="grid grid-cols-[6.5rem_minmax(0,1fr)] gap-x-3 gap-y-1">
              <dt className="text-muted">Заявител</dt>
              <dd className="wrap-anywhere text-ink">
                <Requester row={r} />
              </dd>
              <dt className="text-muted">Доказателство</dt>
              <dd className="wrap-anywhere text-ink">{r.proofNote ?? "—"}</dd>
              <dt className="text-muted">Такса</dt>
              <dd className="text-ink">{fee(r)}</dd>
              <dt className="text-muted">Обяви</dt>
              <dd>
                <Listings row={r} />
              </dd>
              <dt className="text-muted">Създадена</dt>
              <dd className="wrap-anywhere text-ink">
                <Created row={r} />
              </dd>
            </dl>
          </li>
        ))}
      </ul>

      <div className="hidden overflow-hidden rounded-xl border border-line bg-white @4xl:block">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-line text-xs tracking-wide text-muted uppercase">
              <th className="px-4 py-3 font-bold">VIN</th>
              <th className="px-4 py-3 font-bold">Заявител</th>
              <th className="px-4 py-3 font-bold">Доказателство</th>
              <th className="px-4 py-3 font-bold">Такса</th>
              <th className="px-4 py-3 font-bold">Обяви</th>
              <th className="px-4 py-3 font-bold">Създадена</th>
              <th className="px-4 py-3 font-bold">Състояние</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-b border-line/60 align-top last:border-0">
                <td className="px-4 py-3 font-semibold wrap-anywhere text-ink">{r.vinNormalized}</td>
                <td className="px-4 py-3 wrap-anywhere text-muted">
                  <Requester row={r} />
                </td>
                <td className="px-4 py-3 wrap-anywhere text-muted">{r.proofNote ?? "—"}</td>
                <td className="px-4 py-3 whitespace-nowrap text-muted">{fee(r)}</td>
                <td className="px-4 py-3 text-muted">
                  <Listings row={r} />
                </td>
                <td className="px-4 py-3 text-muted">
                  <Created row={r} />
                </td>
                <td className="px-4 py-3">
                  <State row={r} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function fee(r: DeindexRequestRow): string {
  return r.feeAmount ? `${r.feeAmount} ${r.feeCurrency}` : "—";
}

function Requester({ row: r }: { row: DeindexRequestRow }) {
  return (
    <>
      {r.requesterName ?? "—"}
      {r.requesterContact ? <span className="block text-xs text-muted">{r.requesterContact}</span> : null}
    </>
  );
}

/** Hidden / all listings of the VIN; amber while the request is active and some are still visible. */
function Listings({ row: r }: { row: DeindexRequestRow }) {
  const mismatch = r.revokedAt === null && r.suppressedCount !== r.carCount;
  return (
    <>
      <span className={mismatch ? "font-bold text-amber-700" : "text-ink"}>
        {r.suppressedCount}/{r.carCount}
      </span>
      {mismatch ? <span className="block text-xs text-amber-700">не всички са скрити</span> : null}
    </>
  );
}

function Created({ row: r }: { row: DeindexRequestRow }) {
  return (
    <>
      {formatSofiaDate(r.createdAt)}
      {r.createdByEmail ? <span className="block text-xs text-muted">{r.createdByEmail}</span> : null}
    </>
  );
}

function State({ row: r }: { row: DeindexRequestRow }) {
  if (r.revokedAt === null) {
    return (
      <span className="inline-flex shrink-0 items-center rounded-full bg-rose-100 px-2.5 py-0.5 text-xs font-bold text-rose-800 ring-1 ring-rose-200 ring-inset">
        Активна
      </span>
    );
  }
  return (
    <span className="flex flex-col items-start gap-0.5">
      <span className="inline-flex shrink-0 items-center rounded-full bg-neutral-200 px-2.5 py-0.5 text-xs font-bold text-neutral-700 ring-1 ring-neutral-300 ring-inset">
        Отменена
      </span>
      <span className="text-xs text-muted">
        {formatSofiaDate(r.revokedAt)}
        {r.revokedByEmail ? ` · ${r.revokedByEmail}` : ""}
      </span>
    </span>
  );
}
