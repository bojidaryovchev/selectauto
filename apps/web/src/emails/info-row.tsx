import { Column, Link, Row, Text } from "react-email";

type InfoRowProps = {
  label: string;
  value?: string | null;
  /** When set, the value renders as a clickable link (tel:/mailto:/page URL). */
  href?: string;
};

/**
 * One labelled field in the internal notification emails' data table (a
 * lead's name, phone, VIN, …). Empty values render as an em dash so the row
 * still lines up. The label column is fixed-width so every value aligns.
 */
export function InfoRow({ label, value, href }: InfoRowProps) {
  const filled = Boolean(value && value.trim());
  const display = filled ? (value as string) : "—";
  return (
    <Row className="border-b border-solid border-line">
      <Column className="w-33 py-2.75 pr-3 align-top">
        <Text className="m-0 text-[12px] font-semibold uppercase tracking-[0.03em] text-muted">
          {label}
        </Text>
      </Column>
      <Column className="py-2.75 align-top">
        {href && filled ? (
          <Link href={href} className="m-0 text-[15px] font-semibold text-brand-dark no-underline">
            {display}
          </Link>
        ) : (
          <Text className="m-0 text-[15px] font-medium text-ink">{display}</Text>
        )}
      </Column>
    </Row>
  );
}
