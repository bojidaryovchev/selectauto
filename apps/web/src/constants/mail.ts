/**
 * Constants for the admin mail inbox (`/admin/poshta`).
 *
 * The sender is deliberately SEPARATE from `lib/email.ts`'s `FROM`
 * (`noreply@selectauto.bg`): a human reply and an automated notification should
 * not share a reputation, and a customer replying to a person must not be
 * answering a no-reply address. `selectauto.bg` is domain-verified in Resend, so
 * any address at it sends with no extra configuration.
 */
export const MAIL_FROM = {
  name: "SelectAuto",
  address: process.env.MAIL_REPLY_FROM?.trim() || "info@selectauto.bg",
} as const;

/** Thread lifecycle — mirrors the lead vocabulary, CHECK-enforced in the DB. */
export const MAIL_THREAD_STATUSES = ["new", "in_progress", "closed"] as const;

export type MailThreadStatus = (typeof MAIL_THREAD_STATUSES)[number];

/** BG label + the same tailwind badge palette the lead statuses use. */
export const MAIL_THREAD_STATUS_META: Record<
  MailThreadStatus,
  { label: string; badgeClass: string }
> = {
  new: { label: "Нов", badgeClass: "bg-amber-100 text-amber-800 ring-amber-200" },
  in_progress: { label: "В процес", badgeClass: "bg-blue-100 text-blue-800 ring-blue-200" },
  closed: { label: "Затворен", badgeClass: "bg-neutral-200 text-neutral-700 ring-neutral-300" },
};

export function isMailThreadStatus(value: unknown): value is MailThreadStatus {
  return typeof value === "string" && (MAIL_THREAD_STATUSES as readonly string[]).includes(value);
}

/** Threads per page in the inbox list. */
export const MAIL_PAGE_SIZE = 50;
