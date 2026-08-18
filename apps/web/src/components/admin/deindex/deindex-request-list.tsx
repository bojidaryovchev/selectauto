import type { DeindexRequestRow } from "@/queries/deindex";

/**
 * The de-listing register — a plain server component (no interactivity).
 *
 * For a paid service this table IS the audit trail: who asked, what proof was
 * recorded, what was charged and by whom, and whether the suppression is still
 * in force. `Скрити` is resolved live from the VIN, so a mismatch between it and
 * `обяви` is visible immediately — that is what a re-ingested vehicle whose new
 * row was never stamped would look like.
 */
export function DeindexRequestList({ rows }: { rows: DeindexRequestRow[] }) {
  if (rows.length === 0) {
    return (
      <div className="rounded-2xl border border-line bg-white px-6 py-12 text-center text-muted">
        Няма заявки за скриване.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-line bg-white">
      <table className="w-full min-w-200 text-left text-sm">
        <thead>
          <tr className="border-b border-line text-xs uppercase tracking-wide text-muted">
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
          {rows.map((r) => {
            const active = r.revokedAt === null;
            const mismatch = active && r.suppressedCount !== r.carCount;
            return (
              <tr key={r.id} className="border-b border-line/60 last:border-0">
                <td className="px-4 py-3 font-semibold text-ink">{r.vinNormalized}</td>
                <td className="px-4 py-3 text-muted">
                  {r.requesterName ?? "—"}
                  {r.requesterContact ? (
                    <span className="block text-xs">{r.requesterContact}</span>
                  ) : null}
                </td>
                <td className="wrap-break-word px-4 py-3 text-muted">{r.proofNote ?? "—"}</td>
                <td className="whitespace-nowrap px-4 py-3 text-muted">
                  {r.feeAmount ? `${r.feeAmount} ${r.feeCurrency}` : "—"}
                </td>
                <td className="px-4 py-3 text-muted">
                  <span className={mismatch ? "font-bold text-amber-700" : ""}>
                    {r.suppressedCount}/{r.carCount}
                  </span>
                  {mismatch && (
                    <span className="block text-xs text-amber-700">не всички са скрити</span>
                  )}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-muted">
                  {new Date(r.createdAt).toLocaleDateString("bg-BG")}
                  {r.createdByEmail ? (
                    <span className="block text-xs">{r.createdByEmail}</span>
                  ) : null}
                </td>
                <td className="px-4 py-3">
                  {active ? (
                    <span className="inline-flex items-center rounded-full bg-rose-100 px-2.5 py-0.5 text-xs font-bold text-rose-800 ring-1 ring-inset ring-rose-200">
                      Активна
                    </span>
                  ) : (
                    <span className="inline-flex items-center rounded-full bg-neutral-200 px-2.5 py-0.5 text-xs font-bold text-neutral-700 ring-1 ring-inset ring-neutral-300">
                      Отменена
                    </span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
