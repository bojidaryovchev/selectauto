import { Button } from "@/components/common";
import { FileCheckIcon } from "@/components/icons";
import type { VinReportView } from "@/types/vin-report.type";
import { VinReportFiles } from "../vin-report-files";
import { VinReportTags } from "../vin-report-tags";

/**
 * One provider on the VIN desk (`.ab-mbox`): how many records it has for the VIN, the reports already bought from it
 * (newest three, with their files), and its „Купете" button. Without records the button is off: AuctionsAPI answers
 * „records not found" and generates nothing.
 */
export function ProviderBox({
  label,
  records,
  reports,
  primary,
  disabled,
  buying,
  onBuy,
}: {
  label: string;
  records: number;
  reports: VinReportView[];
  /** The view's one orange action (Carfax); the other provider's button is secondary. */
  primary: boolean;
  disabled: boolean;
  buying: boolean;
  onBuy: () => void;
}) {
  const hasRecords = records > 0;
  const again = reports.length > 0;
  const action = again ? "Купете нов отчет" : "Купете отчет";
  return (
    <div className="ab-mbox">
      <b>{label}</b>
      <p className={hasRecords ? "ab-tx2 text-sm" : "ab-dim text-sm"}>
        {hasRecords ? `${records} ${records === 1 ? "запис" : "записа"} в историята` : "Няма записи за този VIN"}
      </p>
      {again ? (
        <ul>
          {reports.slice(0, 3).map((r) => (
            <li key={r.id} className="flex flex-col items-start gap-1">
              <span className="ab-tx2 text-sm">
                Купен на {r.createdAtText}
                {r.orderedBy ? ` от ${r.orderedBy}` : r.origin === "auctionsapi" ? " извън админа" : ""}
              </span>
              <VinReportTags report={r} />
              <VinReportFiles report={r} />
            </li>
          ))}
        </ul>
      ) : null}
      <div>
        <Button
          variant={primary ? "pri" : "sec"}
          size="md"
          className="w-full sm:w-auto"
          disabled={disabled || !hasRecords}
          busy={buying}
          onClick={onBuy}
          aria-label={buying ? `Купуване на отчет ${label}…` : `${action} ${label}`}
        >
          {buying ? null : <FileCheckIcon />}
          {buying ? "Купуване…" : action}
        </Button>
      </div>
      {!hasRecords ? (
        <p className="ab-hint">Без записи {label} не генерира отчет, затова покупката е изключена.</p>
      ) : null}
    </div>
  );
}
