import Link from "next/link";

/**
 * „SELECTAUTO АДМИН“ wordmark. `tone` follows the surface: white on the dark
 * sidebar and drawer, ink on the light top bar. Without `href` it is plain text
 * (the loading skeleton, before the role — and so the right home — is known).
 */
export function AdminBrand({
  href,
  tone,
  onNavigate,
}: {
  href?: string;
  tone: "dark" | "light";
  onNavigate?: () => void;
}) {
  const className = `text-sm font-black uppercase tracking-tight ${tone === "dark" ? "text-white" : "text-ink"}`;
  const label = (
    <>
      SelectAuto <span className={tone === "dark" ? "text-brand-soft" : "text-brand"}>Админ</span>
    </>
  );
  if (!href) return <span className={className}>{label}</span>;
  return (
    <Link
      href={href}
      onClick={onNavigate}
      className={`${className} rounded-md focus-visible:outline-2 focus-visible:outline-offset-4 ${
        tone === "dark" ? "focus-visible:outline-brand-soft" : "focus-visible:outline-brand"
      }`}
    >
      {label}
    </Link>
  );
}
