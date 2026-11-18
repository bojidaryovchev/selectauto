import type { CalculatorOfferEmailData } from "@/lib/email";
import { Section } from "react-email";
import { EmailLayout } from "./email-layout";
import { InfoRow } from "./info-row";
import { Eyebrow, Title } from "./parts";
import { formatBgDateTime } from "./theme";

/**
 * INTERNAL notification (to info@selectauto.bg) for a new calculator-offer
 * lead (board `ms-em-calc-team`): contact details + the exact breakdown the lead received, so the
 * follow-up call references the same numbers. Every line is drawn alike, as on the board and in the admin drawer: the
 * muted style for lines outside the total (decision Q7) is the customer email's.
 */
export function CalculatorOfferNotificationEmail(data: CalculatorOfferEmailData) {
  return (
    <EmailLayout preview={`Нов лийд от калкулатора: ${data.name} — ${data.marketLabel}, ${data.totalFormatted}`}>
      <Eyebrow>Нов лийд — калкулатор</Eyebrow>
      <Title spacing="mb-[22px]">Заявена калкулация ({data.marketLabel})</Title>

      <Section className="border-t border-solid border-line">
        <InfoRow label="Име" value={data.name} />
        <InfoRow label="Телефон" value={data.phone} href={`tel:${data.phone}`} />
        <InfoRow label="Имейл" value={data.email} href={`mailto:${data.email}`} />
        <InfoRow label="Пазар" value={data.marketLabel} />
        {data.lines.map((line) => (
          <InfoRow key={line.label} label={line.label} value={line.amount} variant="wide" />
        ))}
        <InfoRow label="Общо" value={data.totalFormatted} variant="sum" />
        <InfoRow label="Страница" value={data.pageUrl} href={data.pageUrl || undefined} />
        <InfoRow label="Дата" value={formatBgDateTime(data.createdAt)} />
      </Section>
    </EmailLayout>
  );
}
