import { Heading, Section, Text } from "react-email";
import type { CarfaxNotification } from "@/lib/email";
import { EmailLayout } from "./email-layout";
import { InfoRow } from "./info-row";
import { formatBgDateTime } from "./theme";

/**
 * Internal notification (to info@selectauto.bg) for a new Carfax/VIN-check
 * request. The VIN is called out in its own box since it's the key field for
 * the team; phone/email are click-to-contact links.
 */
export function CarfaxNotificationEmail(data: CarfaxNotification) {
  return (
    <EmailLayout preview={`Ново Carfax запитване от ${data.fullName}`}>
      <Text className="m-0 mb-1.5 text-[13px] font-bold uppercase tracking-[0.06em] text-brand-dark">
        Ново запитване
      </Text>
      <Heading className="m-0 mb-5 text-[22px] font-black text-ink-strong">
        Carfax проверка по VIN
      </Heading>

      <Section className="mb-6 rounded-xl border border-solid border-line bg-[#fafafa] px-4.5 py-3.5">
        <Text className="m-0 mb-0.5 text-[12px] font-semibold uppercase tracking-[0.04em] text-muted">
          VIN номер
        </Text>
        <Text className="m-0 text-[20px] font-black tracking-[0.04em] text-ink-strong">
          {data.vin}
        </Text>
      </Section>

      <Section>
        <InfoRow label="Име" value={data.fullName} />
        <InfoRow label="Телефон" value={data.phone} href={`tel:${data.phone}`} />
        <InfoRow
          label="Имейл"
          value={data.email}
          href={data.email ? `mailto:${data.email}` : undefined}
        />
        <InfoRow label="Марка" value={data.carMake} />
        <InfoRow label="Модел" value={data.carModel} />
        <InfoRow label="Съобщение" value={data.message} />
        <InfoRow label="Страница" value={data.pageUrl} href={data.pageUrl || undefined} />
        <InfoRow label="Дата" value={formatBgDateTime(data.createdAt)} />
      </Section>
    </EmailLayout>
  );
}
