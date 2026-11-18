import { statusTone } from "@/lib/car-status-tone";

/**
 * „Статус" and the status with its dot — also the past card's strip. `labelAs="small"` for the phone action bar, whose
 * kit styles the label as a `<small>`.
 */
export function StatusValue({ status, labelAs: Label = "span" }: { status?: string; labelAs?: "span" | "small" }) {
  const tone = statusTone(status);
  return (
    <>
      <Label>Статус</Label>
      <b>
        <span className={tone ? `sa-dot sa-dot--${tone}` : "sa-dot"} aria-hidden="true" /> {status ?? "—"}
      </b>
    </>
  );
}
