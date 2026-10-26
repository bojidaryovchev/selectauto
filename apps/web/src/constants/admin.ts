/**
 * Back-office permissions are CAPABILITIES; a role is only a named bundle of
 * them. Checks in the contract, deposit and mobile.bg back office ask for a
 * capability (`can`, `getSessionWith`, `requirePageWith` in lib/admin.ts),
 * never for a role, so changing what a kind of user may do is an edit to
 * `ROLE_CAPABILITIES` and nothing else. `users.roles` (text[]) holds role ids;
 * someone holding several roles gets the union of their capabilities.
 *
 * The sections only an admin works in — leads, mail, tariffs, recipients,
 * users, de-indexing, the audit log — are still gated on the admin role itself
 * (`requireAdminPage` / `getAdminSession`).
 */
export const CAPABILITIES = [
  /** Enter /admin and follow the contracts and deposits you can see. */
  "backoffice.enter",
  /** See EVERY contract and deposit, with their documents, notices and payment
   *  proofs. Without it, only the ones the user created. */
  "contracts.viewAll",
  /** Create contracts and deposits, and print (generate) their documents. */
  "contracts.create",
  /** Edit a contract's data and amounts, renumber, set where a number series
   *  continues, delete a cancelled contract. */
  "contracts.edit",
  /** Issue payment notices. */
  "notices.generate",
  /** Mark an issued notice as forwarded to the client — clears it from the
   *  „за изпращане" list (owner, 26.10.2026). Only on contracts the user sees. */
  "notices.markSent",
  /** Mark a payment paid, or revert that. */
  "payments.record",
  /** Attach a bank document to a payment stage. */
  "payments.attach",
  /** Move a deposit through its lifecycle; delete a cancelled one. */
  "deposits.manage",
  /** Publish, correct and remove mobile.bg adverts (owner, 18.09.2026). */
  "mobilebg.publish",
] as const;

export type Capability = (typeof CAPABILITIES)[number];

/**
 * Elevated account roles. A normal visitor has none. To add a kind of user, add
 * the id here, its label in APP_ROLE_META and its bundle in ROLE_CAPABILITIES —
 * no schema change, no join tables; /admin/potrebiteli shows it as a column.
 */
export const APP_ROLES = ["admin", "observer", "supervisor"] as const;

export type AppRole = (typeof APP_ROLES)[number];

/** BG label + one-line description per role — for /admin/potrebiteli. */
export const APP_ROLE_META: Record<AppRole, { label: string; description: string }> = {
  admin: {
    label: "Администратор",
    description: "пълен достъп; изпратените на клиента известия отбелязва този, който ги изпраща.",
  },
  observer: {
    label: "Наблюдаващ",
    description:
      "създава договори и депозити, вижда само своите и следи плащанията по тях, прикачва платежни документи, " +
      "публикува в mobile.bg; не може да редактира договори, да генерира известия, да отбелязва плащания, нито " +
      "да вижда заявките от сайта.",
  },
  supervisor: {
    label: "Наблюдаващ – всички договори",
    description:
      "като Наблюдаващ, но вижда всички договори и депозити (не само своите), с документите, известията и " +
      "прикачените платежни документи по тях, и отбелязва кои известия е изпратил на клиента.",
  },
};

/**
 * „Наблюдаващ" (owner spec 07.2026, e.g. Радка): creates and prepares contracts
 * and deposits and follows their payments, but changes nothing afterwards —
 * except attaching bank documents ("да може да прикача платежни към
 * известието") and mobile.bg, both at the owner's request.
 */
const OBSERVER: readonly Capability[] = ["backoffice.enter", "contracts.create", "payments.attach", "mobilebg.publish"];

export const ROLE_CAPABILITIES: Record<AppRole, readonly Capability[]> = {
  // Everything except marking notices sent: that belongs to whoever forwards
  // them. The owner issues the notices, and when his own account could mark
  // them, a click right after issuing (12:30, 26.10.2026) handed the forwarder
  // notices already „изпратени" that he had never sent. The admin still sees the
  // „за изпращане" list, read-only.
  admin: CAPABILITIES.filter((c) => c !== "notices.markSent"),
  observer: OBSERVER,
  // Owner, 26.10.2026: an observer who sees ALL contracts and can download the
  // notices already issued to forward them to clients — still without issuing
  // notices or touching prices — and who works the „за изпращане" list.
  supervisor: [...OBSERVER, "contracts.viewAll", "notices.markSent"],
};

/**
 * The capabilities that change an existing contract, payment or deposit don't
 * check who created the record — only someone who sees every record may hold
 * them. Granting one without `contracts.viewAll` would let that user act on
 * contracts they can't open, so the module refuses to load instead (this file
 * is imported by the proxy and every back-office page, so a build fails at once).
 * To allow it, add a `canSeeRecord` check to those mutations first.
 */
const UNSCOPED: readonly Capability[] = ["contracts.edit", "notices.generate", "payments.record", "deposits.manage"];
for (const role of APP_ROLES) {
  const caps = ROLE_CAPABILITIES[role];
  if (UNSCOPED.some((c) => caps.includes(c)) && !caps.includes("contracts.viewAll")) {
    throw new Error(`Role "${role}" may change contracts it cannot see — grant contracts.viewAll as well.`);
  }
}

function isAppRole(value: string): value is AppRole {
  return (APP_ROLES as readonly string[]).includes(value);
}

/**
 * True when any of these roles carries the capability. Deliberately PURE on a
 * plain roles array: the proxy and the site header (a CLIENT component) need it,
 * and `lib/admin.ts` can't be imported there (it pulls in `auth()` and
 * `redirect`). Unknown role strings grant nothing.
 */
export function rolesGrant(roles: readonly string[] | null | undefined, capability: Capability): boolean {
  return Boolean(roles?.some((r) => isAppRole(r) && ROLE_CAPABILITIES[r].includes(capability)));
}

/** True when these roles may enter /admin at all. */
export function grantsBackOfficeAccess(roles: readonly string[] | null | undefined): boolean {
  return rolesGrant(roles, "backoffice.enter");
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
