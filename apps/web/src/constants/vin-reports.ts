import type { ReportProvider } from "@/lib/vin-report-parse";

/** The admin page for Carfax / AutoCheck reports. */
export const VIN_REPORTS_PATH = "/admin/carfax-otcheti";

/** The providers as their brands write them (sentence case doesn't apply to Latin brand words). */
export const VIN_REPORT_PROVIDER_LABEL: Record<ReportProvider, string> = {
  carfax: "Carfax",
  autocheck: "AutoCheck",
};

/**
 * A purchase claim still pending after this long is treated as unanswered: the list says so, and a new purchase of the
 * same report may take the claim over. A report with a PDF takes 40–60 s and the call gives up at 100 s, so 10 minutes
 * is far beyond a live call.
 */
export const CLAIM_TAKEOVER_MINUTES = 10;

/** The admin link that opens the VIN desk for a VIN, optionally for a Carfax lead (`zayavka`). */
export function vinReportsHref(vin: string, leadId?: number | null): string {
  const q = new URLSearchParams({ vin });
  if (leadId) q.set("zayavka", String(leadId));
  return `${VIN_REPORTS_PATH}?${q.toString()}`;
}
