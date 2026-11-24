import { AdminEmptyState } from "@/components/admin/ui";
import { FileCheckIcon } from "@/components/icons";
import type { VinReportView } from "@/types/vin-report.type";
import { VinReportFiles } from "../vin-report-files";
import { VinReportTags } from "../vin-report-tags";
import { ReportContext } from "./report-context";

/** Who bought a report: the staff member, „Извън админа" for one bought outside the admin with the same key. */
function buyer(r: VinReportView): string {
  return r.orderedBy ?? (r.origin === "auctionsapi" ? "Извън админа" : "—");
}

/**
 * Every report the key bought, newest first: from the admin and from outside it (imported from AuctionsAPI's
 * history). Cards while the list is narrower than 896 px (two columns from 576), the kit's table above (`ab-list`, a
 * container query on the list itself) — the contracts' and mobile.bg's pattern. A server component: links only.
 */
export function VinReportList({ rows, filtered }: { rows: VinReportView[]; filtered: boolean }) {
  if (rows.length === 0) {
    return (
      <AdminEmptyState icon={<FileCheckIcon />} title={filtered ? "Няма отчети за този VIN." : "Още няма отчети."} />
    );
  }
  return (
    <div className="ab-list">
      <ul className="ab-cards">
        {rows.map((r) => (
          <li key={r.id} className="ab-cc gap-2">
            <div className="ab-cc__h">
              {/* `.ab-no` is orange as a linked record number; this one links nowhere (deposit-list.tsx does the same). */}
              <b className="ab-no text-tx">{r.providerLabel}</b>
              <time className="ab-meta" dateTime={r.createdAt}>
                {r.createdAtText}
              </time>
            </div>
            <p className="ab-vin">{r.vin}</p>
            <VinReportTags report={r} />
            <ReportContext report={r} />
            <p className="ab-meta">Купен от: {buyer(r)}</p>
            <VinReportFiles report={r} />
          </li>
        ))}
      </ul>

      <div className="ab-tbl sa-tbl-wrap">
        <table className="sa-tbl">
          <thead>
            <tr>
              <th scope="col">Купен</th>
              <th scope="col">VIN</th>
              <th scope="col">Автомобил</th>
              <th scope="col">Отчет</th>
              <th scope="col">Купен от</th>
              <th scope="col">Файлове</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td className="mute whitespace-nowrap">
                  <time dateTime={r.createdAt}>{r.createdAtText}</time>
                </td>
                <td className="whitespace-nowrap">
                  <span className="ab-mono">{r.vin}</span>
                </td>
                <td className="min-w-56">
                  <ReportContext report={r} />
                </td>
                <td>
                  <span className="flex flex-col items-start gap-1.5">
                    <b>{r.providerLabel}</b>
                    <VinReportTags report={r} />
                  </span>
                </td>
                <td className="mute">{buyer(r)}</td>
                <td>
                  <VinReportFiles report={r} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
