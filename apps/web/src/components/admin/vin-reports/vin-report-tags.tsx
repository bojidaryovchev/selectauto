import { AdminStatusTag } from "@/components/admin/ui";
import type { VinReportView } from "@/types/vin-report.type";

/**
 * What to know about a report besides its files, as the kit's tags (a colour always with its word):
 * - „Генерира се" — bought, no answer yet; „Без потвърждение" once that has lasted over 10 minutes;
 * - „Непотвърден оригинал" — AuctionsAPI's `is_verified_real` is false (the list explains it under itself);
 * - „Тестов VIN" — the docs' free test VIN.
 * Nothing for an ordinary finished report.
 */
export function VinReportTags({
  report,
}: {
  report: Pick<VinReportView, "status" | "unconfirmed" | "verifiedReal" | "isTestVin">;
}) {
  const tags: React.ReactNode[] = [];
  if (report.status === "pending") {
    tags.push(
      report.unconfirmed ? (
        <AdminStatusTag key="pending" tone="warn">
          Без потвърждение
        </AdminStatusTag>
      ) : (
        <AdminStatusTag key="pending" tone="info">
          Генерира се
        </AdminStatusTag>
      ),
    );
  }
  if (report.verifiedReal === false) {
    tags.push(
      <AdminStatusTag key="verified" tone="warn">
        Непотвърден оригинал
      </AdminStatusTag>,
    );
  }
  if (report.isTestVin) {
    tags.push(
      <AdminStatusTag key="test" tone={null}>
        Тестов VIN
      </AdminStatusTag>,
    );
  }
  if (tags.length === 0) return null;
  return <span className="ab-chips">{tags}</span>;
}
