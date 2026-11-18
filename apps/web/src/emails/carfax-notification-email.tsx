import type { CarfaxNotification } from "@/lib/email";
import { Section, Text } from "react-email";
import { EmailLayout } from "./email-layout";
import { InfoRow } from "./info-row";
import { Eyebrow, Title } from "./parts";
import { formatBgDateTime } from "./theme";

/**
 * Internal notification (to info@selectauto.bg) for a new Carfax/VIN-check
 * request (board `ms-em-carfax`). The VIN is called out in its own box, in mono, since it's the key field for
 * the team; phone/email are click-to-contact links.
 */
export function CarfaxNotificationEmail(data: CarfaxNotification) {
  return (
    <EmailLayout preview={`Ново Carfax запитване от ${data.fullName}`}>
      <Eyebrow>Ново запитване</Eyebrow>
      <Title>Carfax проверка по VIN</Title>

      <Section className="mb-[22px] rounded-[10px] border border-solid border-line bg-panel px-[18px] py-3.5">
        <Text className="m-0 mb-0.5 text-[12.5px] leading-[1.4] font-bold text-muted">VIN номер</Text>
        <Text className="m-0 font-mono text-[21px] leading-[1.3] font-semibold tracking-[0.06em] break-all text-ink">
          {data.vin}
        </Text>
      </Section>

      <Section className="border-t border-solid border-line">
        <InfoRow label="Име" value={data.fullName} />
        <InfoRow label="Телефон" value={data.phone} href={`tel:${data.phone}`} />
        <InfoRow label="Имейл" value={data.email} href={data.email ? `mailto:${data.email}` : undefined} />
        <InfoRow label="Марка" value={data.carMake} />
        <InfoRow label="Модел" value={data.carModel} />
        <InfoRow label="Съобщение" value={data.message} />
        <InfoRow label="Страница" value={data.pageUrl} href={data.pageUrl || undefined} />
        <InfoRow label="Дата" value={formatBgDateTime(data.createdAt)} />
      </Section>
    </EmailLayout>
  );
}
