import type { LeadStatus, LeadType } from "@/constants/admin";
import type { VinReportView } from "@/types/vin-report.type";

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
  /** A Carfax lead's reports box (its VIN's Carfax / AutoCheck reports); absent for other lead types. */
  vinReports?: LeadVinReports;
};

/** One report in a Carfax lead's drawer, with whether it was e-mailed to this lead. */
export type LeadVinReport = VinReportView & {
  /** When it was last e-mailed to this lead („24.11.2026 г., 14:05"); null when never. */
  sentAtText: string | null;
  /** The Поща conversation it went into. */
  sentThreadId: number | null;
};

/** A Carfax lead's reports box in the drawer: the reports bought for its VIN, and what to send them with. */
export type LeadVinReports = {
  leadId: number;
  name: string;
  /** The lead's address when it can take an e-mail; null says why the report can't be sent from here. */
  email: string | null;
  /** The lead's VIN, normalised. */
  vin: string;
  /** For the e-mail's default text: AuctionsAPI's vehicle name, else the lead's make and model. */
  vehicle: string | null;
  /** /admin/carfax-otcheti with this VIN checked and the purchase tied to the lead. */
  checkHref: string;
  items: LeadVinReport[];
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
