import { statusTone } from "@/lib/car-status-tone";

/** „Статус" and the status with its dot — also the past card's strip. */
export function StatusValue({ status }: { status?: string }) {
  const tone = statusTone(status);
  return (
    <>
      <span>Статус</span>
      <b>
        <span className={tone ? `sa-dot sa-dot--${tone}` : "sa-dot"} aria-hidden="true" /> {status ?? "—"}
      </b>
    </>
  );
}
