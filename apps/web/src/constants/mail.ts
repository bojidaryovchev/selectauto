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

/** BG label and the kit tone (`sa-tag--…`, `sa-dot--…`), as the lead statuses have; null is the neutral one. */
export const MAIL_THREAD_STATUS_META: Record<MailThreadStatus, { label: string; tone: "warn" | "info" | null }> = {
  new: { label: "Нов", tone: "warn" },
  in_progress: { label: "В процес", tone: "info" },
  closed: { label: "Затворен", tone: null },
};

export function isMailThreadStatus(value: unknown): value is MailThreadStatus {
  return typeof value === "string" && (MAIL_THREAD_STATUSES as readonly string[]).includes(value);
}

/** Threads per page in the inbox list. */
export const MAIL_PAGE_SIZE = 50;
