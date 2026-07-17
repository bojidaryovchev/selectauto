import type { LeadStatus, LeadType } from "@/constants/admin";

/** One labelled field in a lead's detail drawer. */
export type AdminDetailField = {
  label: string;
  value: string;
  /** When set, the value renders as a link (tel:/mailto:/http). */
  href?: string;
  /** Monospace the value (VIN, IP). */
  mono?: boolean;
};

/**
 * A lead normalised for the generic admin inbox UI: the three lead tables differ
 * in columns, so the server maps each row to this shared shape (compact `cells`
 * for the table + full `details` for the drawer). Keeps the client `LeadInbox`
 * type-agnostic.
 */
export type AdminLeadView = {
  type: LeadType;
  id: number;
  status: LeadStatus;
  /** Formatted for display (bg-BG). */
  createdAt: string;
  updatedAt: string;
  adminNotes: string | null;
  /** Table cells, aligned to the inbox's type-specific column headers. */
  cells: string[];
  /** Full field list for the detail drawer. */
  details: AdminDetailField[];
};

/** Filters accepted by every admin lead-inbox query. */
export type LeadListFilters = {
  /** A specific status, or undefined for "all except archived". */
  status?: LeadStatus;
  /** Free-text search (name / phone / …, per lead type). */
  q?: string;
  /** 1-based page. */
  page?: number;
};

/** One page of admin lead rows plus pagination metadata. */
export type LeadPage<Row> = {
  rows: Row[];
  total: number;
  page: number;
  pageCount: number;
};
