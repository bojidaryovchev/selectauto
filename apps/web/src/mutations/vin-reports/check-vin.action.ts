"use server";

import { getSessionWith } from "@/lib/admin";
import { getCachedVinRecords } from "@/lib/vin-report-cache";
import { normalizeVin } from "@/lib/vin-report-parse";
import { findCatalogCarByVin, listVinReportsForVins } from "@/queries/vin-reports";
import type { ActionResult } from "@/types/action-result.type";
import type { VinReportView } from "@/types/vin-report.type";

export type VinDeskCheck = {
  vin: string;
  /** AuctionsAPI's vehicle name („HONDA CR-V EX 2018"), verbatim. */
  vehicle: string | null;
  /** How many records each provider has: a report can only be bought from one that has some. */
  carfax: number;
  autocheck: number;
  /** The reports already bought for this VIN, newest first. */
  reports: VinReportView[];
  car: { id: number; title: string } | null;
};

/**
 * The VIN desk's FREE step (/admin/carfax-otcheti): how many Carfax and AutoCheck records AuctionsAPI has for the VIN,
 * the reports already bought for it, and the catalog car. The counts are fetched fresh (`maxAgeMs: 0`, refreshing the
 * public /proverka-vin cache row too), with the cached row as the fallback when AuctionsAPI doesn't answer. A server
 * action is a POST anyone can send, so the capability is checked here, not only on the page.
 */
export async function checkVinForReports(vinInput: string): Promise<ActionResult<VinDeskCheck>> {
  if (!(await getSessionWith("reports.order"))) {
    return { success: false, error: "Нямате достъп до тази операция." };
  }
  const vin = normalizeVin(vinInput);
  if (!vin) {
    return { success: false, error: "Въведете валиден 17-значен VIN номер (без I, O, Q)." };
  }

  let records;
  try {
    records = await getCachedVinRecords(vin, { maxAgeMs: 0 });
  } catch (error) {
    console.error("[vin-reports] record check failed", { vin, error });
    return { success: false, error: "Проверката в AuctionsAPI не успя. Опитайте отново след малко." };
  }

  const [reports, car] = await Promise.all([listVinReportsForVins([vin]), findCatalogCarByVin(vin)]);
  return {
    success: true,
    data: {
      vin,
      vehicle: records.vehicle,
      carfax: records.carfax,
      autocheck: records.autocheck,
      reports: reports.get(vin) ?? [],
      car,
    },
  };
}
