import type { InquiryNotification } from "@/lib/email";
import { Section } from "react-email";
import { EmailLayout } from "./email-layout";
import { InfoRow } from "./info-row";
import { Eyebrow, Title } from "./parts";
import { formatBgDateTime } from "./theme";

/**
 * Internal notification (to info@selectauto.bg) for a new "Безплатна
 * консултация" inquiry from the site-wide quiz modal (board `ms-em-inquiry`). Phone is a click-to-call
 * link so the team can act on the lead directly from the inbox.
 */
export function InquiryNotificationEmail(data: InquiryNotification) {
  return (
    <EmailLayout preview={`Ново запитване от ${data.name}`}>
      <Eyebrow>Ново запитване</Eyebrow>
      <Title spacing="mb-[22px]">Безплатна консултация</Title>

      <Section className="border-t border-solid border-line">
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
