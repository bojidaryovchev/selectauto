import { CONTACT } from "@/constants";
import type { CalculatorOfferEmailData } from "@/lib/email";
import { Column, Hr, Link, Row, Section, Text } from "react-email";
import { EmailLayout } from "./email-layout";
import { Eyebrow, Paragraph, Title } from "./parts";

/**
 * CUSTOMER-facing email for the /kalkulator gated-offer flow (board `ms-em-calc`): the itemized
 * import-cost breakdown exactly as the visitor configured it, with the honest
 * transit estimate, the rates-verified stamp, and a clear "this is an estimate,
 * not an offer" disclaimer. The CTA is a reply/call — the lead is already in
 * the DB, so the team follows up either way.
 *
 * Lines that don't add up to the total („Междинна сума (до Холандия)", „Митническа основа") are muted, as on the
 * site's calculator. The rates line no longer lists „екотакса": the breakdown has no such line (decision 19).
 */
export function CalculatorOfferEmail(data: CalculatorOfferEmailData) {
  return (
    <EmailLayout preview={`Вашата калкулация за внос от ${data.marketLabel} — общо ≈ ${data.totalFormatted}`}>
      <Eyebrow>Калкулация за внос</Eyebrow>
      <Title>Внос от {data.marketLabel} — ориентировъчна разбивка</Title>
      <Paragraph>
        Здравейте, {data.name}! Ето разбивката по стойностите, които зададохте в калкулатора на SelectAuto.
      </Paragraph>

      <Section className="mt-1.5 border-t border-solid border-line">
        {data.lines.map((line) => (
          <Row
            key={line.label}
            className={`border-b ${line.muted ? "border-dashed border-line-dash" : "border-solid border-line"}`}
          >
            <Column className="py-3 pr-5 align-top">
              <Text
                className={`m-0 text-[14px] leading-normal font-medium ${line.muted ? "text-faint" : "text-muted"}`}
              >
                {line.label}
              </Text>
            </Column>
            <Column className="py-3 text-right align-top whitespace-nowrap">
              <Text
                className={`m-0 text-[15px] leading-normal ${line.muted ? "font-medium text-faint" : "font-bold text-ink"}`}
                style={{ fontVariantNumeric: "tabular-nums" }}
              >
                {line.amount}
              </Text>
            </Column>
          </Row>
        ))}
      </Section>

      <Section className="mt-3.5 mb-[18px] rounded-[10px] bg-panel">
        <Row>
          <Column className="py-4 pr-4 pl-[18px] align-middle max-[480px]:py-3.5 max-[480px]:pl-4">
            <Text className="m-0 text-[15px] leading-[1.35] font-extrabold text-ink">Общо (ориентир)</Text>
          </Column>
          <Column className="py-4 pr-[18px] text-right align-middle whitespace-nowrap max-[480px]:py-3.5 max-[480px]:pr-4">
            <Text
              className="m-0 text-[24px] leading-[1.1] font-extrabold tracking-[-0.01em] text-ink max-[480px]:text-[21px]"
              style={{ fontVariantNumeric: "tabular-nums" }}
            >
              {data.totalFormatted}
            </Text>
          </Column>
        </Row>
      </Section>

      <Text className="m-0 mb-1 text-[13.5px] leading-[1.6] font-medium text-muted">
        Ориентировъчен срок за доставка:{" "}
        <strong className="font-extrabold whitespace-nowrap text-ink">{data.transit}</strong>
      </Text>
      <Text className="m-0 mb-1 text-[13.5px] leading-[1.6] font-medium text-muted">
        Ставките (мито, ДДС) са проверени към {data.ratesVerifiedAt}.
      </Text>

      <Hr className="my-[22px] border-line" />

      <Text className="m-0 mb-2.5 text-[14px] leading-[1.65] text-muted">
        Това е ориентировъчна оценка по зададени от Вас стойности и НЕ представлява обвързваща оферта. Точните мита,
        такси и транспорт зависят от конкретния автомобил и актуалните тарифи.
      </Text>
      <Paragraph spacing="mt-3.5 mb-0">
        За точна, персонална калкулация за конкретен автомобил — отговорете на този имейл или се обадете на{" "}
        <Link href={CONTACT.phoneHref} className="font-bold whitespace-nowrap text-ortx no-underline">
          {CONTACT.phone}
        </Link>
        . Ще се свържем с Вас и по телефона.
      </Paragraph>
    </EmailLayout>
  );
}
