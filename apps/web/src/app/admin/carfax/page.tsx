import type { Metadata } from "next";
import { after } from "next/server";
import { LeadInbox } from "@/components/admin";
import { AdminPageHeader } from "@/components/admin/ui";
import { can, requireAdminPage } from "@/lib/admin";
import { LEAD_TYPE_META } from "@/constants/admin";
import { CARFAX_COLUMNS, toCarfaxView } from "@/lib/admin-lead-view";
import { getMakeLogoLookup } from "@/lib/make-logo-lookup";
import { parseLeadFilters, type LeadSearchParams } from "@/lib/admin-lead-filters";
import { syncVinReportHistory } from "@/lib/vin-report-history";
import { listCarfaxRequests } from "@/queries/admin";
import { listCheckedVehicles, listVinReportSends, listVinReportsForVins } from "@/queries/vin-reports";

export const metadata: Metadata = { title: LEAD_TYPE_META.carfax.label };

/**
 * /admin/carfax — the Carfax / VIN-report lead inbox. Reads the URL filters
 * (status/q/page), queries one page of `carfax_requests`, maps each row to the
 * shared AdminLeadView (with each make's logo plate), and hands it to the generic
 * <LeadInbox> (boards `ad-carfax`, `ad-carfax-drawer`, `ad-carfax-phone`; parity check
 * docs/design/parity/admin-leads.md).
 * `requireAdminPage()` is the gate — the /admin layout (and the proxy) only
 * require back-office access, which observers have too.
 *
 * Each lead's drawer lists the Carfax / AutoCheck reports already bought for its
 * VIN — each can be e-mailed to the client with its PDF, as a conversation in
 * Поща — and links to /admin/carfax-otcheti to check and buy one. Reports bought
 * outside the admin reach it through the history import, run here after the
 * response (`after`, at most every 10 minutes) so it never slows the inbox.
 */
export default async function AdminCarfaxPage({
  searchParams,
}: {
  searchParams: Promise<LeadSearchParams>;
}) {
  const session = await requireAdminPage();
  const sp = await searchParams;
  const filters = parseLeadFilters(sp);
  const [{ rows, total, page, pageCount }, logoFor] = await Promise.all([
    listCarfaxRequests(filters),
    getMakeLogoLookup(),
  ]);
  const canOrderReports = can(session, "reports.order");
  const vins = rows.map((r) => r.vin);
  const [reports, sends, vehicles] = canOrderReports
    ? await Promise.all([
        listVinReportsForVins(vins),
        listVinReportSends(rows.map((r) => r.id)),
        listCheckedVehicles(vins),
      ])
    : [null, null, null];
  if (canOrderReports) {
    after(async () => {
      try {
        await syncVinReportHistory({ minIntervalMs: 10 * 60_000 });
      } catch (error) {
        console.error("[vin-reports] history import after the Carfax inbox failed", error);
      }
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <AdminPageHeader title={LEAD_TYPE_META.carfax.label} />
      <LeadInbox
        basePath={LEAD_TYPE_META.carfax.href}
        columns={CARFAX_COLUMNS}
        leads={rows.map((row) => {
          const vin = row.vin.trim().toUpperCase();
          return toCarfaxView(
            row,
            logoFor,
            reports && sends && vehicles
              ? { reports: reports.get(vin) ?? [], sends, vehicle: vehicles.get(vin) ?? null }
              : null,
          );
        })}
        page={page}
        pageCount={pageCount}
        total={total}
      />
    </div>
  );
}
