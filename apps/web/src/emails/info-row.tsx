import { Column, Link, Row, Text } from "react-email";

type InfoRowProps = {
  label: string;
  value?: string | null;
  /** When set, the value renders as a clickable link (tel:/mailto:/page URL). */
  href?: string;
  /**
   * `wide`: a breakdown line — the label takes the room, the amount sits on the right in tabular figures; `sum`: the
   * total, in heavier type.
   */
  variant?: "wide" | "sum";
};

/**
 * One labelled field in the internal notification emails' data table (a lead's name, phone, VIN, …; board `ms-row`).
 * Empty values render as an em dash so the row still lines up. The label column is 132 px wide so every value aligns;
 * on a phone the label goes above its value (breakdown lines keep their two columns).
 */
export function InfoRow({ label, value, href, variant }: InfoRowProps) {
  const filled = Boolean(value && value.trim());
  const display = filled ? (value as string) : "—";
  const wide = variant === "wide" || variant === "sum";
  const labelTone = variant === "sum" ? "text-[14px] font-extrabold text-ink" : "text-muted";
  const valueTone =
    variant === "sum"
      ? "text-[17px] font-extrabold text-ink"
      : filled
        ? "text-[15px] font-semibold text-ink"
        : "text-[15px] font-medium text-muted";
  return (
    <Row className="border-b border-solid border-line">
      <Column
        className={`py-[11px] pr-4 align-top ${wide ? "" : "w-[132px] max-[480px]:block max-[480px]:w-full max-[480px]:pt-2.5 max-[480px]:pb-0"}`}
      >
        <Text className={`m-0 pt-px text-[13px] leading-[1.6] font-semibold ${labelTone}`}>{label}</Text>
      </Column>
      <Column
        className={`py-[11px] align-top ${wide ? "text-right whitespace-nowrap" : "max-[480px]:block max-[480px]:w-full max-[480px]:pt-px max-[480px]:pb-2.5"}`}
      >
        {href && filled ? (
          <Link href={href} className="m-0 text-[15px] leading-[1.55] font-bold break-all text-ortx no-underline">
            {display}
          </Link>
        ) : (
          <Text
            className={`m-0 leading-[1.55] ${valueTone}`}
            style={wide ? { fontVariantNumeric: "tabular-nums" } : undefined}
          >
            {display}
          </Text>
        )}
      </Column>
    </Row>
  );
}
