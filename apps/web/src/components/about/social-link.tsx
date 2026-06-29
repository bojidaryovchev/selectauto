import type { ReactNode } from "react";
import { LinkButton } from "@/components/common";

/**
 * Round social-icon button used in the About "Следвайте ни" card. Pass an icon
 * from `@/components/icons` as `children`; the icon renders its own `<svg>`,
 * sized here via the `[&_svg]` rules.
 */
export function SocialLink({
  href,
  label,
  children,
}: {
  href: string;
  label: string;
  children: ReactNode;
}) {
  const external = !href.startsWith("#");
  return (
    <LinkButton
      href={href}
      aria-label={label}
      rippleTheme="light"
      target={external ? "_blank" : undefined}
      rel={external ? "noopener noreferrer" : undefined}
      className="inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-white/[0.14] bg-white/[0.06] text-white transition-all duration-200 hover:-translate-y-0.5 hover:border-brand/55 hover:bg-brand/15 [&_svg]:block [&_svg]:h-5 [&_svg]:w-5"
    >
      {children}
    </LinkButton>
  );
}
