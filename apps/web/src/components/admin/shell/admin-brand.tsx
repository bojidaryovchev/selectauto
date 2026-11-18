import Link from "next/link";
import { Logo } from "@/components/common";

/**
 * The back office's brand (boards `ad-shell-roles`, `ad-shell-phone`): the SelectAuto logo, on the dark ground only
 * (decision 2), with an „Админ" tag. `compact` is the phone top bar's and the drawer's smaller logo. Without `href` it
 * is not a link (the loading skeleton, before the role — and so the right home — is known).
 */
export function AdminBrand({
  href,
  compact = false,
  onNavigate,
}: {
  href?: string;
  compact?: boolean;
  onNavigate?: () => void;
}) {
  const content = (
    <>
      <Logo size={compact ? "bar" : "header"} />
      <span>Админ</span>
    </>
  );
  if (!href) return <span className="ad-brand">{content}</span>;
  return (
    <Link href={href} onClick={onNavigate} className="ad-brand">
      {content}
    </Link>
  );
}
