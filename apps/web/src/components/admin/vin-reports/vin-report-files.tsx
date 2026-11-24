import { DownloadIcon, ExternalLinkIcon } from "@/components/icons";
import type { VinReportView } from "@/types/vin-report.type";

/**
 * A report's files on AuctionsAPI's CDN: the PDF (what staff send) and the HTML page, each in a new tab (`.ab-dl`,
 * 40 px tall). „—" while there are none (a purchase still pending). `label` names the report for a screen reader,
 * where several rows' „PDF" links sit together.
 */
export function VinReportFiles({
  report,
}: {
  report: Pick<VinReportView, "pdfUrl" | "htmlUrl" | "providerLabel" | "vin">;
}) {
  if (!report.pdfUrl && !report.htmlUrl) return <span className="ab-dim">—</span>;
  const name = `${report.providerLabel} ${report.vin}`;
  return (
    <span className="ab-row gap-x-4 gap-y-0">
      {report.pdfUrl ? (
        <a
          href={report.pdfUrl}
          target="_blank"
          rel="noreferrer"
          className="ab-dl hover:underline"
          aria-label={`PDF на отчета ${name} (нов раздел)`}
        >
          <DownloadIcon />
          PDF
        </a>
      ) : null}
      {report.htmlUrl ? (
        <a
          href={report.htmlUrl}
          target="_blank"
          rel="noreferrer"
          className="ab-dl hover:underline"
          aria-label={`Отчетът ${name} като страница (нов раздел)`}
        >
          <ExternalLinkIcon />
          HTML
        </a>
      ) : null}
    </span>
  );
}
