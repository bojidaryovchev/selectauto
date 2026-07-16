import { isLeadStatus } from "@/constants/admin";
import type { LeadListFilters } from "@/types/admin.type";

/** URL search params shape a lead-inbox page receives. */
export type LeadSearchParams = Record<string, string | string[] | undefined>;

/**
 * Parse an inbox page's `searchParams` into the typed `LeadListFilters` the list
 * queries accept. Ignores unknown/invalid values (an unknown status → "all").
 */
export function parseLeadFilters(sp: LeadSearchParams): LeadListFilters {
  const status = typeof sp.status === "string" && isLeadStatus(sp.status) ? sp.status : undefined;
  const q = typeof sp.q === "string" ? sp.q : undefined;
  const pageRaw = typeof sp.page === "string" ? Number.parseInt(sp.page, 10) : NaN;
  const page = Number.isFinite(pageRaw) && pageRaw > 0 ? pageRaw : 1;
  return { status, q, page };
}
