import { PAYMENT_STATUS_META, type PaymentStatus } from "@/constants/contracts";

/**
 * Colored pill for a payment-stage status (§4.2). Server-renderable; used on
 * the contracts list (stage chips) and the detail stage cards.
 */
export function PaymentStatusBadge({ status, prefix }: { status: string; prefix?: string }) {
  const meta = PAYMENT_STATUS_META[status as PaymentStatus];
  if (!meta) return null;
  return (
    <span
      className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-bold ring-1 ${meta.badgeClass}`}
    >
      {prefix ? <span className="font-semibold opacity-70">{prefix}:</span> : null}
      {meta.label}
    </span>
  );
}
