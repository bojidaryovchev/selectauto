import { Heading, Section, Text } from "react-email";
import type { InquiryNotification } from "@/lib/email";
import { EmailLayout } from "./email-layout";
import { InfoRow } from "./info-row";
import { formatBgDateTime } from "./theme";

/**
 * Internal notification (to info@selectauto.bg) for a new "Безплатна
 * консултация" inquiry from the site-wide quiz modal. Phone is a click-to-call
 * link so the team can act on the lead directly from the inbox.
 */
export function InquiryNotificationEmail(data: InquiryNotification) {
  return (
    <EmailLayout preview={`Ново запитване от ${data.name}`}>
      <Text className="m-0 mb-1.5 text-[13px] font-bold uppercase tracking-[0.06em] text-brand-dark">
        Ново запитване
      </Text>
      <Heading className="m-0 mb-5 text-[22px] font-black text-ink-strong">
        Безплатна консултация
      </Heading>

      <Section>
        <InfoRow label="Име" value={data.name} />
        <InfoRow label="Телефон" value={data.phone} href={`tel:${data.phone}`} />
        <InfoRow label="Конкретен модел" value={data.specificModel} />
        <InfoRow label="Марка" value={data.brand} />
        <InfoRow label="Модел" value={data.model} />
        <InfoRow label="Бюджет" value={data.budget} />
        <InfoRow label="Срок" value={data.time} />
        <InfoRow label="Финансиране" value={data.finance} />
        <InfoRow label="Страница" value={data.pageUrl} href={data.pageUrl || undefined} />
        <InfoRow label="Дата" value={formatBgDateTime(data.createdAt)} />
      </Section>
    </EmailLayout>
  );
}
