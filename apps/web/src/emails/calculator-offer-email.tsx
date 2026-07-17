import { Column, Heading, Hr, Link, Row, Section, Text } from "react-email";
import { CONTACT } from "@/constants";
import type { CalculatorOfferEmailData } from "@/lib/email";
import { EmailLayout } from "./email-layout";

/**
 * CUSTOMER-facing email for the /kalkulator gated-offer flow: the itemized
 * import-cost breakdown exactly as the visitor configured it, with the honest
 * transit estimate, the rates-verified stamp, and a clear "this is an estimate,
 * not an offer" disclaimer. The CTA is a reply/call — the lead is already in
 * the DB, so the team follows up either way.
 */
export function CalculatorOfferEmail(data: CalculatorOfferEmailData) {
  return (
    <EmailLayout preview={`Вашата калкулация за внос от ${data.marketLabel} — общо ≈ ${data.totalFormatted}`}>
      <Text className="m-0 mb-1.5 text-[13px] font-bold uppercase tracking-[0.06em] text-brand-dark">
        Калкулация за внос
      </Text>
      <Heading className="m-0 mb-2 text-[22px] font-black text-ink-strong">
        Внос от {data.marketLabel} — ориентировъчна разбивка
      </Heading>
      <Text className="m-0 mb-5 text-[15px] leading-[1.7] text-ink">
        Здравейте, {data.name}! Ето разбивката по стойностите, които зададохте в
        калкулатора на SelectAuto.
      </Text>

      <Section>
        {data.lines.map((line) => (
          <Row key={line.label} className="border-b border-solid border-line">
            <Column className="py-2.5 pr-3 align-top">
              <Text className="m-0 text-[14px] text-muted">{line.label}</Text>
            </Column>
            <Column className="w-30 py-2.5 text-right align-top">
              <Text className="m-0 text-[14px] font-semibold text-ink">{line.amount}</Text>
            </Column>
          </Row>
        ))}
        <Row>
          <Column className="py-3 pr-3 align-top">
            <Text className="m-0 text-[15px] font-black uppercase tracking-[0.03em] text-ink-strong">
              Общо (ориентир)
            </Text>
          </Column>
          <Column className="w-30 py-3 text-right align-top">
            <Text className="m-0 text-[17px] font-black text-brand-dark">
              {data.totalFormatted}
            </Text>
          </Column>
        </Row>
      </Section>

      <Text className="m-0 mb-1 text-[13px] leading-[1.7] text-muted">
        Ориентировъчен срок за доставка: <strong>{data.transit}</strong>
      </Text>
      <Text className="m-0 mb-4 text-[13px] leading-[1.7] text-muted">
        Ставките (мито, ДДС, екотакса) са проверени към {data.ratesVerifiedAt}.
      </Text>

      <Hr className="my-4 border-line" />

      <Text className="m-0 mb-4 text-[13px] leading-[1.7] text-muted">
        Това е ориентировъчна оценка по зададени от Вас стойности и НЕ представлява
        обвързваща оферта. Точните мита, такси и транспорт зависят от конкретния
        автомобил и актуалните тарифи.
      </Text>
      <Text className="m-0 text-[15px] leading-[1.7] text-ink">
        За точна, персонална калкулация за конкретен автомобил — отговорете на този
        имейл или се обадете на{" "}
        <Link href={CONTACT.phoneHref} className="font-semibold text-brand-dark no-underline">
          {CONTACT.phone}
        </Link>
        . Ще се свържем с Вас и по телефона.
      </Text>
    </EmailLayout>
  );
}
