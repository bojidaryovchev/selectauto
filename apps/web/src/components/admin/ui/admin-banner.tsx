import { AlertIcon, CircleCheckIcon, InfoIcon, TriangleAlertIcon } from "@/components/icons";

export type AdminBannerTone = "error" | "success" | "warning" | "info";

const TONES: Record<AdminBannerTone, { cls: string; Icon: (props: { className?: string }) => React.ReactNode }> = {
  error: { cls: "sa-alert--neg", Icon: AlertIcon },
  success: { cls: "sa-alert--pos", Icon: CircleCheckIcon },
  warning: { cls: "sa-alert--warn", Icon: TriangleAlertIcon },
  info: { cls: "sa-alert--info", Icon: InfoIcon },
};

/**
 * A result or notice line — what an action did, or why it can't (board `ab-messages`): the kit's alert with its icon.
 * Put it next to the control that caused it. An error is announced at once (`role="alert"`), the others politely
 * (`role="status"`). Long tokens (IBAN, e-mail, URL) wrap.
 */
export function AdminBanner({
  tone,
  children,
  className,
}: {
  tone: AdminBannerTone;
  children: React.ReactNode;
  className?: string;
}) {
  const { cls, Icon } = TONES[tone];
  return (
    <div role={tone === "error" ? "alert" : "status"} className={`sa-alert bo-alert ${cls} wrap-anywhere ${className ?? ""}`}>
      <Icon />
      <div className="min-w-0">{children}</div>
    </div>
  );
}
