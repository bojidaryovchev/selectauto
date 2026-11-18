import { AdminStatusTag } from "@/components/admin/ui";
import { PAYMENT_STATUS_META, type PaymentStatus } from "@/constants/contracts";

/**
 * A payment stage's status as the kit's tag (boards `ab-contracts`, `ab-contract-stages`). Server-renderable; used on
 * the contracts list (stage chips, with the stage as `prefix`) and the detail stage cards.
 */
export function PaymentStatusBadge({ status, prefix }: { status: string; prefix?: string }) {
  const meta = PAYMENT_STATUS_META[status as PaymentStatus];
  if (!meta) return null;
  return (
    <AdminStatusTag tone={meta.tone} prefix={prefix}>
      {meta.label}
    </AdminStatusTag>
  );
}
