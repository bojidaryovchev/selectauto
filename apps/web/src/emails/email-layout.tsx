import type { ReactNode } from "react";
import {
  Body,
  Container,
  Head,
  Hr,
  Html,
  Img,
  Link,
  Preview,
  Section,
  Tailwind,
  Text,
} from "react-email";
import { CONTACT, SOCIALS } from "@/constants";
import { emailBaseUrl, emailTailwindConfig } from "./theme";

type EmailLayoutProps = {
  /** Inbox-preview snippet (hidden in the body, shown in the client's list). */
  preview: string;
  children: ReactNode;
};

/**
 * Shared chrome for every SelectAuto email: a dark header band carrying the
 * gold logo (the logo is gold-on-transparent, so it needs the dark `--sa-shell`
 * band to read), a brand accent underline, the message body, and a footer with
 * the real contact details + socials from `@/constants`.
 *
 * The whole tree is wrapped in `<Tailwind>` so the utility classes compile to
 * inline styles (see `theme.ts`). Widths/paddings resolve to px for Outlook via
 * the `pixelBasedPreset` in the config.
 */
export function EmailLayout({ preview, children }: EmailLayoutProps) {
  const baseUrl = emailBaseUrl();
  return (
    <Html lang="bg" dir="ltr">
      <Head />
      <Preview>{preview}</Preview>
      <Tailwind config={emailTailwindConfig}>
        <Body className="m-0 bg-[#f4f4f5] px-3 py-8 font-sans text-ink">
          <Container className="mx-auto w-full max-w-150 overflow-hidden rounded-2xl bg-white shadow-[0_12px_30px_rgba(0,0,0,0.08)]">
            {/* Header — gold logo on the dark shell, brand accent underline. */}
            <Section className="border-b-4 border-solid border-brand bg-shell px-8 py-7 text-center">
              <Img
                src={`${baseUrl}/logo.png`}
                alt="SelectAuto"
                width="176"
                className="mx-auto h-auto w-44"
              />
            </Section>

            {/* Message body */}
            <Section className="p-8">{children}</Section>

            {/* Footer */}
            <Section className="border-t border-solid border-line bg-[#fafafa] px-8 py-6">
              <Text className="m-0 mb-1 text-[14px] font-bold text-ink-strong">SelectAuto</Text>
              <Text className="m-0 text-[13px] leading-[1.7] text-muted">
                <Link href={CONTACT.phoneHref} className="text-muted no-underline">
                  {CONTACT.phone}
                </Link>
                {"  ·  "}
                <Link href={CONTACT.emailHref} className="text-muted no-underline">
                  {CONTACT.email}
                </Link>
              </Text>
              <Text className="m-0 mt-2 text-[13px] leading-[1.7] text-muted">
                {SOCIALS.map((social, index) => (
                  <span key={social.label}>
                    {index > 0 ? "  ·  " : null}
                    <Link href={social.href} className="text-brand-dark no-underline">
                      {social.label}
                    </Link>
                  </span>
                ))}
              </Text>
              <Hr className="my-4 border-line" />
              <Text className="m-0 text-[12px] text-muted">
                © 2026 SelectAuto. Всички права запазени.
              </Text>
            </Section>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
}
