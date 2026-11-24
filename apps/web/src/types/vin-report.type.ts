import type { ReportProvider } from "@/lib/vin-report-parse";

/**
 * One Carfax / AutoCheck report (a `vin_reports` row) as the admin shows it — the list on /admin/carfax-otcheti, the
 * VIN desk and the Carfax lead drawer. Formatted on the server (lib/vin-report-view.ts), so the client components
 * only lay it out.
 */
export type VinReportView = {
  id: number;
  provider: ReportProvider;
  /** „Carfax" | „AutoCheck". */
  providerLabel: string;
  vin: string;
  /** `pending`: bought, no answer yet (the claim before the paid call, or a call that timed out). */
  status: "pending" | "ready";
  /** Pending for over 10 minutes: no confirmation that it was bought, and a new purchase may take over its claim. */
  unconfirmed: boolean;
  htmlUrl: string | null;
  pdfUrl: string | null;
  /** AuctionsAPI's `is_verified_real`, verbatim; null on reports from before 30.08.2026. */
  verifiedReal: boolean | null;
  /** The docs' free test VIN: no charge, shown as a test. */
  isTestVin: boolean;
  /** `admin`: bought here; `auctionsapi`: bought elsewhere with the same key and imported. */
  origin: "admin" | "auctionsapi";
  /** Who bought it here: the user's name, else e-mail. */
  orderedBy: string | null;
  /** The Carfax lead it was bought for, while that lead exists. */
  lead: { id: number; name: string } | null;
  /** The newest catalog car with this VIN that isn't de-indexed. */
  car: { id: number; title: string } | null;
  /** The newest contract with this VIN. */
  contract: { id: number; number: string } | null;
  /** ISO. */
  createdAt: string;
  /** „23.11.2026 г., 09:24" (Sofia time). */
  createdAtText: string;
};
