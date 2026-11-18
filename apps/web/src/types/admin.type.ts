import type { LeadStatus, LeadType } from "@/constants/admin";

/** A car make with its logo, for the plate beside it (decision 8); `logo` null shows the make's two letters. */
export type LeadMake = { name: string; logo: string | null };

/** The calculator's markets, each drawn with its flag. */
export type LeadMarket = "kr" | "us" | "ca";

/** One labelled field in a lead's detail drawer. */
export type AdminDetailField = {
  label: string;
  value: string;
  /** When set, the value renders as a link (tel:/mailto:/http). */
  href?: string;
  /** Monospace the value (VIN, IP). */
  mono?: boolean;
  /** The make's plate before the value („Марка"). */
  make?: LeadMake;
  /** The market's flag before the value („Пазар"). */
  market?: LeadMarket;
  /** Set larger: an offer's total. */
  big?: boolean;
};

/** One cell of a lead's row (or card line), aligned to the inbox's columns. */
export type AdminLeadCell = {
  text: string;
  /** Monospace (the VIN). */
  mono?: boolean;
  /** The make's plate before the text (the car, the interest). */
  make?: LeadMake;
  /** The market's flag before the text. */
  market?: LeadMarket;
};

/** A column of the lead inbox's table; `num` right-aligns it (an amount). */
export type AdminLeadColumn = { label: string; num?: boolean };

/**
 * A lead normalised for the generic admin inbox UI: the three lead tables differ
 * in columns, so the server maps each row to this shared shape (compact `cells`
 * for the table + the drawer's field lists). Keeps the client `LeadInbox`
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
  /** Table cells, aligned to the inbox's type-specific columns; the first is the person's name. */
  cells: AdminLeadCell[];
  /** The drawer's first list: what the person sent. */
  details: AdminDetailField[];
  /** An offer's price, total and breakdown lines, right-aligned in a list of their own; empty for other types. */
  amounts: AdminDetailField[];
  /** The page, the IP address, received and updated. */
  meta: AdminDetailField[];
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
