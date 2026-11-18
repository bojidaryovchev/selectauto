import { Text } from "react-email";
import { EmailLayout } from "./email-layout";
import { Cta, LinkFallback, Paragraph, Signature, Title } from "./parts";

type VerificationEmailProps = {
  name?: string;
  /** Absolute verification link (built by the caller from APP_URL + token). */
  verifyUrl: string;
};

/** Sent to a newly registered user to confirm their email address (24h link; board `ms-em-verify`). */
export function VerificationEmail({ name, verifyUrl }: VerificationEmailProps) {
  return (
    <EmailLayout preview="Потвърдете имейл адреса си за SelectAuto">
      <Title>Добре дошли в SelectAuto</Title>
      <Paragraph>Здравейте{name ? ` ${name}` : ""},</Paragraph>
      <Paragraph>
        Благодарим за регистрацията. За да активирате профила си, потвърдете имейл адреса си с бутона по-долу.
      </Paragraph>

      <Cta href={verifyUrl}>Потвърдете имейла</Cta>

      <Text className="m-0 mb-2.5 text-[14px] leading-[1.65] text-muted">
        Линкът е валиден 24 часа. Ако не сте се регистрирали, игнорирайте този имейл.
      </Text>
      <LinkFallback intro="Ако бутонът не работи, копирайте този адрес в браузъра си:" href={verifyUrl} />

      <Signature>
        Поздрави,
        <br />
        Екипът на SelectAuto
      </Signature>
    </EmailLayout>
  );
}
