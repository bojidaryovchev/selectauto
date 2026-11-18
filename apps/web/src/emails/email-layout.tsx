import { CONTACT, SOCIALS } from "@/constants";
import type { ReactNode } from "react";
import { Body, Column, Container, Head, Hr, Html, Img, Link, Preview, Row, Tailwind, Text } from "react-email";
import { emailBaseUrl, emailTailwindConfig } from "./theme";

type EmailLayoutProps = {
  /** Inbox-preview snippet (hidden in the body, shown in the client's list). */
  preview: string;
  children: ReactNode;
};

/**
 * Shared chrome for every SelectAuto email (boards `ms-base`, `ms-em-*`): a 600 px white card on a pale desk, the
 * night band carrying the gold logo (the logo is gold-on-transparent, so it needs the dark band to read), the message
 * body, and a light footer with the real contact details + socials from `@/constants`. On a phone (under 480 px) the
 * card meets the screen's edges and the paddings tighten.
 *
 * The whole tree is wrapped in `<Tailwind>` so the utility classes compile to inline styles (see `theme.ts`); `<Head>`
 * sits inside it, where the phone rules go as a media query. The color-scheme metas ask mail apps to keep the light
 * body. Every size is px, from the `pixelBasedPreset` steps or an arbitrary value, because several clients (notably
 * Outlook) ignore rem; the card's shadow is a plain value, since Gmail drops declarations that use var().
 *
 * The padded blocks are `Row`/`Column` cells, not `Section`s: react-email moves a Section's (and the Body's) padding
 * onto an inner cell but leaves its class on the table, so a phone rule like `max-[480px]:px-5` would never reach the
 * padding. A Column is one cell with both.
 */
export function EmailLayout({ preview, children }: EmailLayoutProps) {
  const baseUrl = emailBaseUrl();
  return (
    <Html lang="bg" dir="ltr">
      <Tailwind config={emailTailwindConfig}>
        <Head>
          <meta name="color-scheme" content="light" />
          <meta name="supported-color-schemes" content="light" />
        </Head>
        <Preview>{preview}</Preview>
        {/* lang again: react-email's Body sets lang="en" on <body> and its cell unless told otherwise. */}
        <Body lang="bg" className="m-0 bg-desk font-sans text-body">
          {/* The desk around the card; none on a phone, where the card meets the screen's edges. */}
          <Row>
            <Column className="px-3 py-8 max-[480px]:p-0">
              <Container className="mx-auto w-full max-w-[600px] overflow-hidden rounded-[12px] bg-white [box-shadow:0_10px_28px_rgba(16,18,22,0.07)] max-[480px]:rounded-none max-[480px]:[box-shadow:none]">
                {/* The night band with the logo. */}
                <Row>
                  <Column className="bg-night px-10 py-5 text-center max-[480px]:px-5 max-[480px]:py-[18px]">
                    <Img
                      src={`${baseUrl}/logo.png`}
                      alt="SelectAuto"
                      width="132"
                      className="mx-auto h-auto w-[132px] max-[480px]:w-28"
                    />
                  </Column>
                </Row>

                {/* Message body */}
                <Row>
                  <Column className="px-10 pt-10 pb-9 max-[480px]:px-5 max-[480px]:pt-7 max-[480px]:pb-[26px]">
                    {children}
                  </Column>
                </Row>

                {/* Footer. The rule sits on the Row: a table's border="0" keeps its other sides at 0, which a cell
                    lacks (border-solid would give a Column's other three sides the default 3 px). */}
                <Row className="border-t border-solid border-line">
                  <Column className="bg-foot px-10 pt-6 pb-[26px] max-[480px]:px-5 max-[480px]:pt-[22px] max-[480px]:pb-6">
                    <Text className="m-0 mb-0.5 text-[14px] leading-[1.7] font-extrabold text-ink">SelectAuto</Text>
                    <Text className="m-0 text-[13px] leading-[1.7] font-medium text-muted">
                      <Link href={CONTACT.phoneHref} className="text-muted no-underline">
                        {CONTACT.phone}
                      </Link>
                      {"  ·  "}
                      <Link href={CONTACT.emailHref} className="text-muted no-underline">
                        {CONTACT.email}
                      </Link>
                    </Text>
                    <Text className="m-0 mt-1.5 text-[13px] leading-[1.7] font-medium text-muted">
                      {SOCIALS.map((social, index) => (
                        <span key={social.label}>
                          {index > 0 ? "  ·  " : null}
                          <Link href={social.href} className="font-bold text-ortx no-underline">
                            {social.label}
                          </Link>
                        </span>
                      ))}
                    </Text>
                    <Hr className="my-3.5 border-line" />
                    <Text className="m-0 text-[12px] leading-[1.7] font-medium text-muted">
                      © 2026 SelectAuto. Всички права запазени.
                    </Text>
                  </Column>
                </Row>
              </Container>
            </Column>
          </Row>
        </Body>
      </Tailwind>
    </Html>
  );
}
