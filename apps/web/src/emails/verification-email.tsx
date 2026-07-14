import { Button, Heading, Link, Section, Text } from "react-email";
import { EmailLayout } from "./email-layout";

type VerificationEmailProps = {
  name?: string;
  /** Absolute verification link (built by the caller from APP_URL + token). */
  verifyUrl: string;
};

/** Sent to a newly registered user to confirm their email address (24h link). */
export function VerificationEmail({ name, verifyUrl }: VerificationEmailProps) {
  return (
    <EmailLayout preview="Потвърдете имейл адреса си за SelectAuto">
      <Heading className="m-0 mb-4 text-[24px] font-black text-ink-strong">
        Добре дошли в SelectAuto
      </Heading>
      <Text className="m-0 mb-4 text-[16px] leading-[1.7] text-ink">
        Здравейте{name ? ` ${name}` : ""},
      </Text>
      <Text className="m-0 mb-6 text-[16px] leading-[1.7] text-ink">
        Благодарим за регистрацията. За да активирате профила си, потвърдете имейл адреса си с
        бутона по-долу.
      </Text>

      <Section className="mb-6 text-center">
        <Button
          href={verifyUrl}
          className="box-border rounded-full bg-brand px-8 py-3.75 text-[15px] font-extrabold text-white no-underline"
        >
          Потвърдете имейла
        </Button>
      </Section>

      <Text className="m-0 mb-2 text-[14px] leading-[1.7] text-muted">
        Линкът е валиден 24 часа. Ако не сте се регистрирали, игнорирайте този имейл.
      </Text>
      <Text className="m-0 mb-1 text-[13px] text-muted">
        Ако бутонът не работи, копирайте този адрес в браузъра си:
      </Text>
      <Link href={verifyUrl} className="text-[13px] break-all text-brand-dark">
        {verifyUrl}
      </Link>

      <Text className="m-0 mt-7 text-[15px] leading-[1.7] text-ink">
        Поздрави,
        <br />
        Екипът на SelectAuto
      </Text>
    </EmailLayout>
  );
}
