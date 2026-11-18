import { MAIL_THREAD_STATUS_META, isMailThreadStatus } from "@/constants/mail";

/**
 * A mail thread's status as the kit's tag with its dot (board `ad-mail`): Нов amber, В процес blue, Затворен neutral;
 * an unknown value shows as stored, neutral. Plain component — usable from both server and client trees, like
 * `LeadStatusBadge`.
 */
export function MailStatusBadge({ status }: { status: string }) {
  const { label, tone } = isMailThreadStatus(status) ? MAIL_THREAD_STATUS_META[status] : { label: status, tone: null };
  return (
    <span className={tone ? `sa-tag shrink-0 sa-tag--${tone}` : "sa-tag shrink-0"}>
      <span className={tone ? `sa-dot sa-dot--${tone}` : "sa-dot"} aria-hidden="true" />
      {label}
    </span>
  );
}
