/**
 * Elevated account roles (RBAC-ready). `users.roles` is a text[] holding any of
 * these; a normal visitor has none. To add a role, extend this list — then map
 * roles to capabilities in code as needed (no schema change, no join tables).
 *
 *  admin    — full access to the back office.
 *  observer — „Наблюдаващ" (e.g. accountants; owner spec 07.2026): may CREATE
 *             and prepare contracts/deposits and follow contracts + payment
 *             notices, but may not edit anything afterwards. Editing, issuing
 *             notices, and marking payments paid/unpaid stay with admins.
 *             Any number of observer accounts can exist.
 */
export const APP_ROLES = ["admin", "observer"] as const;

export type AppRole = (typeof APP_ROLES)[number];

/** BG label per role — for the back-office UI. */
export const APP_ROLE_META: Record<AppRole, { label: string }> = {
  admin: { label: "Администратор" },
  observer: { label: "Наблюдаващ" },
};

/**
 * True when these roles may enter /admin at all. Deliberately a PURE helper on a
 * plain roles array: the site header needs this check in a CLIENT component, and
 * `lib/admin.ts` can't be imported there (it pulls in `auth()` and `redirect`).
 * Keep this list in step with the proxy's /admin gate.
 */
export function grantsBackOfficeAccess(roles: readonly string[] | null | undefined): boolean {
  return Boolean(roles?.some((r) => r === "admin" || r === "observer"));
}

/**
 * Shared constants for the owner-facing /admin back office (migration 0029).
 *
 * The three lead tables (carfax_requests, inquiries, calculator_offers) share a
 * common lifecycle: a `status` from `new` through `contacted` to a terminal
 * `won`/`lost`, plus `archived` to hide handled leads from the default view.
 * Labels are Bulgarian (the whole site + back office is BG).
 */

/** The pipeline statuses, in display order. Mirrors the DB `status` values. */
export const LEAD_STATUSES = ["new", "contacted", "won", "lost", "archived"] as const;

export type LeadStatus = (typeof LEAD_STATUSES)[number];

/** BG label + a tailwind badge palette for each status. */
export const LEAD_STATUS_META: Record<
  LeadStatus,
  { label: string; badgeClass: string }
> = {
  new: { label: "Ново", badgeClass: "bg-amber-100 text-amber-800 ring-amber-200" },
  contacted: { label: "В процес", badgeClass: "bg-blue-100 text-blue-800 ring-blue-200" },
  won: { label: "Спечелено", badgeClass: "bg-emerald-100 text-emerald-800 ring-emerald-200" },
  lost: { label: "Загубено", badgeClass: "bg-rose-100 text-rose-800 ring-rose-200" },
  archived: { label: "Архив", badgeClass: "bg-neutral-200 text-neutral-700 ring-neutral-300" },
};

/** The three lead sources the back office manages. */
export const LEAD_TYPES = ["carfax", "inquiry", "calculator"] as const;

export type LeadType = (typeof LEAD_TYPES)[number];

/** BG label + admin route segment for each lead type. */
export const LEAD_TYPE_META: Record<
  LeadType,
  { label: string; short: string; href: string }
> = {
  carfax: { label: "Carfax запитвания", short: "Carfax", href: "/admin/carfax" },
  inquiry: { label: "Консултации", short: "Консултации", href: "/admin/zapitvaniya" },
  calculator: { label: "Оферти от калкулатора", short: "Оферти", href: "/admin/oferti" },
};

/** How many rows one inbox page shows. */
export const ADMIN_PAGE_SIZE = 50;

/** Narrow an untrusted string to a LeadStatus (used when parsing form input). */
export function isLeadStatus(value: unknown): value is LeadStatus {
  return typeof value === "string" && (LEAD_STATUSES as readonly string[]).includes(value);
}

/** Narrow an untrusted string to a LeadType. */
export function isLeadType(value: unknown): value is LeadType {
  return typeof value === "string" && (LEAD_TYPES as readonly string[]).includes(value);
}
