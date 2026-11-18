import { AdminEmptyState } from "@/components/admin/ui";
import { EyeOffIcon } from "@/components/icons";
import { formatDbAmount } from "@/lib/money";
import { formatSofiaDate } from "@/lib/sofia-time";
import type { DeindexRequestRow } from "@/queries/deindex";

/**
 * The de-listing register (boards `ab-hidden`, `ab-hidden-done`; parity check docs/design/parity/admin-hidden.md) —
 * a plain server component (no interactivity). Cards below a 56rem list, the kit's table above (`ab-list`).
 *
 * For a paid service this list IS the audit trail: who asked, what proof was
 * recorded, what was charged and by whom, and whether the suppression is still
 * in force. `Обяви` is resolved live from the VIN (hidden / all), so a mismatch
 * shows at once — that is what a re-ingested vehicle whose new row was never
 * stamped looks like.
 */
export function DeindexRequestList({ rows }: { rows: DeindexRequestRow[] }) {
  if (rows.length === 0) return <AdminEmptyState title="Няма заявки за скриване." icon={<EyeOffIcon />} />;

  return (
    <div className="ab-list">
      <ul className="ab-cards grid-cols-1!">
        {rows.map((r) => (
          <li key={r.id} className="ab-cc ab-reg">
            <div className="ab-cc__h">
              <b className="ab-mono ab-wrap">{r.vinNormalized}</b>
              <State row={r} />
            </div>
            <dl>
              <dt>Заявител</dt>
              <dd>
                <Requester row={r} />
              </dd>
              <dt>Доказателство</dt>
              <dd>{r.proofNote ?? "—"}</dd>
              <dt>Такса</dt>
              <dd>{fee(r)}</dd>
              <dt>Обяви</dt>
              <dd>
                <Listings row={r} />
              </dd>
              <dt>Създадена</dt>
              <dd>
                <Created row={r} />
              </dd>
            </dl>
          </li>
        ))}
      </ul>

      <div className="ab-tbl">
        <div className="sa-tbl-wrap">
          <table className="sa-tbl">
            <thead>
              <tr>
                <th>VIN</th>
                <th>Заявител</th>
                <th>Доказателство</th>
                <th>Такса</th>
                <th>Обяви</th>
                <th>Създадена</th>
                <th>Състояние</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td>
                    <b className="ab-mono">{r.vinNormalized}</b>
                  </td>
                  <td className="ab-rt wrap-anywhere">
                    <Requester row={r} />
                  </td>
                  <td className="mute wrap-anywhere">{r.proofNote ?? "—"}</td>
                  <td className="mute whitespace-nowrap">{fee(r)}</td>
                  <td>
                    <Listings row={r} />
                  </td>
                  <td className="ab-rt">
                    <Created row={r} />
                  </td>
                  <td>
                    <State row={r} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/** The fee in the bg-BG format („50,00 EUR", decision 11; it read „50.00 EUR"). */
function fee(r: DeindexRequestRow): string {
  return r.feeAmount ? `${formatDbAmount(r.feeAmount)} ${r.feeCurrency}` : "—";
}

function Requester({ row: r }: { row: DeindexRequestRow }) {
  return (
    <>
      {r.requesterName ?? "—"}
      {r.requesterContact ? <small>{r.requesterContact}</small> : null}
    </>
  );
}

/** Hidden / all listings of the VIN; amber while the request is active and some are still visible. */
function Listings({ row: r }: { row: DeindexRequestRow }) {
  const mismatch = r.revokedAt === null && r.suppressedCount !== r.carCount;
  return mismatch ? (
    <span className="ab-mis">
      {r.suppressedCount}/{r.carCount}
      <small>не всички са скрити</small>
    </span>
  ) : (
    <>
      {r.suppressedCount}/{r.carCount}
    </>
  );
}

function Created({ row: r }: { row: DeindexRequestRow }) {
  return (
    <>
      {formatSofiaDate(r.createdAt)}
      {r.createdByEmail ? <small>{r.createdByEmail}</small> : null}
    </>
  );
}

function State({ row: r }: { row: DeindexRequestRow }) {
  // Plain tags, no dot, as the boards draw this register's states.
  if (r.revokedAt === null) return <span className="sa-tag ab-st shrink-0 sa-tag--neg">Активна</span>;
  return (
    <span className="ab-rt">
      <span className="sa-tag ab-st shrink-0">Отменена</span>
      <small>
        {formatSofiaDate(r.revokedAt)}
        {r.revokedByEmail ? ` · ${r.revokedByEmail}` : ""}
      </small>
    </span>
  );
}
