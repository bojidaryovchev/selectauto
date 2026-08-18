import { MAIL_THREAD_STATUS_META, isMailThreadStatus } from "@/constants/mail";

/**
 * Presentational status pill for a mail thread. Plain component — usable from
 * both server and client trees, like `LeadStatusBadge`.
 */
export function MailStatusBadge({ status }: { status: string }) {
  const meta = isMailThreadStatus(status)
    ? MAIL_THREAD_STATUS_META[status]
    : { label: status, badgeClass: "bg-neutral-200 text-neutral-700 ring-neutral-300" };

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold ring-1 ring-inset ${meta.badgeClass}`}
    >
      {meta.label}
    </span>
  );
}
