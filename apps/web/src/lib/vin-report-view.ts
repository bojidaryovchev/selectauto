import { CLAIM_TAKEOVER_MINUTES, VIN_REPORT_PROVIDER_LABEL } from "@/constants/vin-reports";
import { carTitle } from "@/lib/mobilebg/car-title";
import { formatSofiaDateTime } from "@/lib/sofia-time";
import { FREE_TEST_VIN, isReportProvider } from "@/lib/vin-report-parse";
import type { VinReportView } from "@/types/vin-report.type";

/**
 * A `vin_reports` row with what the admin shows beside it (queries/vin-reports), and its mapping to `VinReportView`.
 * Pure: dates are formatted here, on the server, in Sofia time.
 */
export type VinReportRow = {
  id: number;
  provider: string;
  vin: string;
  status: string;
  htmlUrl: string | null;
  pdfUrl: string | null;
  verifiedReal: boolean | null;
  origin: string;
  carfaxRequestId: number | null;
  createdAt: Date;
  updatedAt: Date;
  orderedByName: string | null;
  orderedByEmail: string | null;
  leadName: string | null;
  car: { id: number; title: string | null; year: number | null } | null;
  contract: { id: number; number: string } | null;
};

export function toVinReportView(row: VinReportRow, now: number = Date.now()): VinReportView {
  const provider = isReportProvider(row.provider) ? row.provider : "carfax";
  const status = row.status === "pending" ? "pending" : "ready";
  return {
    id: row.id,
    provider,
    providerLabel: VIN_REPORT_PROVIDER_LABEL[provider],
    vin: row.vin,
    status,
    unconfirmed: status === "pending" && now - row.updatedAt.getTime() > CLAIM_TAKEOVER_MINUTES * 60_000,
    htmlUrl: row.htmlUrl,
    pdfUrl: row.pdfUrl,
    verifiedReal: row.verifiedReal,
    isTestVin: row.vin === FREE_TEST_VIN,
    origin: row.origin === "admin" ? "admin" : "auctionsapi",
    orderedBy: row.orderedByName?.trim() || row.orderedByEmail || null,
    lead: row.carfaxRequestId && row.leadName ? { id: row.carfaxRequestId, name: row.leadName } : null,
    car: row.car ? { id: row.car.id, title: carTitle(row.car.year, row.car.title, row.car.id) } : null,
    contract: row.contract,
    createdAt: row.createdAt.toISOString(),
    createdAtText: formatSofiaDateTime(row.createdAt),
  };
}
