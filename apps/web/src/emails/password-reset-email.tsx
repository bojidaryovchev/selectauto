import { Button, Heading, Link, Section, Text } from "react-email";
import { EmailLayout } from "./email-layout";

type PasswordResetEmailProps = {
  name?: string;
  /** Absolute reset link (built by the caller from APP_URL + token). */
  resetUrl: string;
};

/** Sent when a user requests a password reset (single-use, 1h link). */
export function PasswordResetEmail({ name, resetUrl }: PasswordResetEmailProps) {
  return (
    <EmailLayout preview="Заявка за смяна на парола в SelectAuto">
      <Heading className="m-0 mb-4 text-[24px] font-black text-ink-strong">Смяна на парола</Heading>
      <Text className="m-0 mb-4 text-[16px] leading-[1.7] text-ink">
        Здравейте{name ? ` ${name}` : ""},
      </Text>
      <Text className="m-0 mb-6 text-[16px] leading-[1.7] text-ink">
        Получихме заявка за смяна на паролата за профила ви. Задайте нова парола с бутона по-долу.
      </Text>

      <Section className="mb-6 text-center">
        <Button
          href={resetUrl}
          className="box-border rounded-full bg-brand px-8 py-3.75 text-[15px] font-extrabold text-white no-underline"
        >
          Задайте нова парола
        </Button>
      </Section>

      <Text className="m-0 mb-2 text-[14px] leading-[1.7] text-muted">
        Линкът е валиден 1 час. Ако не сте поискали смяна на паролата, игнорирайте този имейл —
        профилът ви остава непроменен.
      </Text>
      <Text className="m-0 mb-1 text-[13px] text-muted">
        Ако бутонът не работи, копирайте този адрес в браузъра си:
      </Text>
      <Link href={resetUrl} className="text-[13px] break-all text-brand-dark">
        {resetUrl}
      </Link>

      <Text className="m-0 mt-7 text-[15px] leading-[1.7] text-ink">
        Поздрави,
        <br />
        Екипът на SelectAuto
      </Text>
    </EmailLayout>
  );
}
