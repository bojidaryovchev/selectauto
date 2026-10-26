export type AdminBannerTone = "error" | "success" | "warning" | "info";

const TONES: Record<AdminBannerTone, string> = {
  error: "border-[#f3c4bf] bg-[#fdecea] text-[#b3261e]",
  success: "border-[#bfe3c9] bg-[#e8f5ec] text-[#1d6b35]",
  warning: "border-amber-300 bg-amber-50 text-amber-900",
  info: "border-sky-200 bg-sky-50 text-sky-900",
};

/**
 * A result or notice line — what an action did, or why it can't. Put it next to
 * the control that caused it. An error is announced at once (`role="alert"`),
 * the others politely (`role="status"`). Long tokens (IBAN, e-mail, URL) wrap.
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
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={`rounded-lg border px-3 py-2 text-sm font-semibold wrap-anywhere ${TONES[tone]} ${className ?? ""}`}
    >
      {children}
    </div>
  );
}
