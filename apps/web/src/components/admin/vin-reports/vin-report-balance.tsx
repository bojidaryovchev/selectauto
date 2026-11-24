import { AdminBanner } from "@/components/admin/ui";
import { formatUsd } from "@/lib/money";
import type { ReportBalance } from "@/lib/vin-report-parse";

/**
 * AuctionsAPI's report balance, read as the page renders (free): what is available, how many reports it covers as
 * AuctionsAPI counts them (no price is computed here — AuctionsAPI doesn't state one), and the reports being
 * generated right now with the money they hold. A warning when it covers none; another when it couldn't be read.
 */
export function VinReportBalance({ balance }: { balance: ReportBalance | null }) {
  if (!balance) {
    return (
      <AdminBanner tone="warning" className="ab-al">
        Балансът в AuctionsAPI не можа да се прочете. Опреснете страницата след малко.
      </AdminBanner>
    );
  }
  return (
    <div className="ab-stack gap-2">
      <ul className="ab-stats" aria-label="Баланс в AuctionsAPI">
        <li>
          Баланс в AuctionsAPI: <b>{formatUsd(balance.availableUsd)}</b>
        </li>
        <li>
          Стига за <b>{balance.reports}</b> {balance.reports === 1 ? "отчет" : "отчета"}
        </li>
        {balance.activeReports > 0 ? (
          <li className="is-warn">
            Генерират се: <b>{balance.activeReports}</b> ({formatUsd(balance.activeUsd)} задържани)
          </li>
        ) : null}
      </ul>
      {balance.reports <= 0 ? (
        <AdminBanner tone="warning" className="ab-al">
          Балансът в AuctionsAPI е изчерпан. Нов отчет може да бъде купен, след като бъде зареден.
        </AdminBanner>
      ) : null}
    </div>
  );
}
