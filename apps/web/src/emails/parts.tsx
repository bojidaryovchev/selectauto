import type { ReactNode } from "react";
import { Button, Heading, Link, Section, Text } from "react-email";

/**
 * The pieces the e-mails share (boards `ms-base`, `ms-em-*`): the eyebrow with its orange bar, the heading, a body
 * paragraph, the orange button with its fallback address, and the signature. Every text is passed in, so each template
 * keeps its own words. `spacing` replaces a piece's default margins (two margin classes on one element would be decided
 * by stylesheet order, not by the caller).
 */

/** „Калкулация за внос": dark orange, after an 18 × 2 orange bar (an inline element: mail clients drop ::before). */
export function Eyebrow({ children }: { children: ReactNode }) {
  return (
    <Text className="m-0 mb-3 text-[13px] leading-[1.3] font-bold tracking-[0.02em] text-ortx">
      <span
        aria-hidden="true"
        style={{
          display: "inline-block",
          width: "18px",
          height: "2px",
          backgroundColor: "#FF7A1A",
          verticalAlign: "middle",
          marginRight: "10px",
        }}
      />
      {children}
    </Text>
  );
}

export function Title({
  children,
  spacing = "mb-[18px] max-[480px]:mb-3.5",
}: {
  children: ReactNode;
  spacing?: string;
}) {
  return (
    <Heading
      as="h1"
      className={`m-0 text-[26px] leading-tight font-extrabold tracking-[-0.012em] text-ink max-[480px]:text-[23px] ${spacing}`}
    >
      {children}
    </Heading>
  );
}

export function Paragraph({ children, spacing = "mb-4" }: { children: ReactNode; spacing?: string }) {
  return <Text className={`m-0 text-[16px] leading-[1.65] text-body ${spacing}`}>{children}</Text>;
}

/**
 * The orange button with dark text (7.5:1), its corners cut like the site's primary — clients that ignore clip-path
 * (Gmail, Outlook) show a plain rectangle. Full width on a phone, with 12 px sides so the longest label („Вижте
 * любимите автомобили") stays on one line at 320 px.
 */
export function Cta({
  href,
  children,
  spacing = "my-7 max-[480px]:my-6",
}: {
  href: string;
  children: ReactNode;
  spacing?: string;
}) {
  return (
    <Section className={`text-center ${spacing}`}>
      <Button
        href={href}
        className="box-border bg-orange px-8 py-4 text-center text-[16px] font-extrabold tracking-[0.01em] text-night no-underline max-[480px]:block max-[480px]:px-3"
        style={{
          clipPath: "polygon(10px 0,100% 0,100% calc(100% - 10px),calc(100% - 10px) 100%,0 100%,0 10px)",
        }}
      >
        {children}
      </Button>
    </Section>
  );
}

/** „Ако бутонът не работи, …" and the address itself, wrapped anywhere — for when the button doesn't work. */
export function LinkFallback({ intro, href }: { intro: ReactNode; href: string }) {
  return (
    <>
      <Text className="m-0 mb-1 text-[13px] leading-[1.6] font-medium text-muted">{intro}</Text>
      <Link href={href} className="block text-[13px] leading-[1.6] font-semibold break-all text-ortx underline">
        {href}
      </Link>
    </>
  );
}

/** „Поздрави, / Екипът на SelectAuto". */
export function Signature({ children }: { children: ReactNode }) {
  return <Text className="m-0 mt-7 text-[15px] leading-[1.65] text-body">{children}</Text>;
}
