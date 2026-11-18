import { Text } from "react-email";
import { EmailLayout } from "./email-layout";
import { Cta, LinkFallback, Paragraph, Signature, Title } from "./parts";

type PasswordResetEmailProps = {
  name?: string;
  /** Absolute reset link (built by the caller from APP_URL + token). */
  resetUrl: string;
};

/** Sent when a user requests a password reset (single-use, 1h link; board `ms-em-reset`). */
export function PasswordResetEmail({ name, resetUrl }: PasswordResetEmailProps) {
  return (
    <EmailLayout preview="Заявка за смяна на парола в SelectAuto">
      <Title>Смяна на парола</Title>
      <Paragraph>Здравейте{name ? ` ${name}` : ""},</Paragraph>
      <Paragraph>Получихме заявка за смяна на паролата за профила ви. Задайте нова парола с бутона по-долу.</Paragraph>

      <Cta href={resetUrl}>Задайте нова парола</Cta>

      <Text className="m-0 mb-2.5 text-[14px] leading-[1.65] text-muted">
        Линкът е валиден 1 час. Ако не сте поискали смяна на паролата, игнорирайте този имейл — профилът ви остава
        непроменен.
      </Text>
      <LinkFallback intro="Ако бутонът не работи, копирайте този адрес в браузъра си:" href={resetUrl} />

      <Signature>
        Поздрави,
        <br />
        Екипът на SelectAuto
      </Signature>
    </EmailLayout>
  );
}
