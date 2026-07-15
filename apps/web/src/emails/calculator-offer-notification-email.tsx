import { Heading, Section, Text } from "react-email";
import type { CalculatorOfferEmailData } from "@/lib/email";
import { EmailLayout } from "./email-layout";
import { InfoRow } from "./info-row";
import { formatBgDateTime } from "./theme";

/**
 * INTERNAL notification (to info@selectauto.bg) for a new calculator-offer
 * lead: contact details + the exact breakdown the lead received, so the
 * follow-up call references the same numbers.
 */
export function CalculatorOfferNotificationEmail(data: CalculatorOfferEmailData) {
  return (
    <EmailLayout preview={`Нов лийд от калкулатора: ${data.name} — ${data.marketLabel}, ${data.totalEurFormatted}`}>
      <Text className="m-0 mb-1.5 text-[13px] font-bold uppercase tracking-[0.06em] text-brand-dark">
        Нов лийд — калкулатор
      </Text>
      <Heading className="m-0 mb-5 text-[22px] font-black text-ink-strong">
        Заявена калкулация ({data.marketLabel})
      </Heading>

      <Section>
        <InfoRow label="Име" value={data.name} />
        <InfoRow label="Телефон" value={data.phone} href={`tel:${data.phone}`} />
        <InfoRow label="Имейл" value={data.email} href={`mailto:${data.email}`} />
        <InfoRow label="Пазар" value={data.marketLabel} />
        {data.lines.map((line) => (
          <InfoRow key={line.label} label={line.label} value={line.amount} />
        ))}
        <InfoRow label="Общо" value={`${data.totalEurFormatted} (≈ ${data.totalBgnFormatted})`} />
        <InfoRow label="Страница" value={data.pageUrl} href={data.pageUrl || undefined} />
        <InfoRow label="Дата" value={formatBgDateTime(data.createdAt)} />
      </Section>
    </EmailLayout>
  );
}
