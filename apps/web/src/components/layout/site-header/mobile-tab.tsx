import Link from "next/link";

/** A single tab in the mobile bottom navigation bar. */
export function MobileTab({
  label,
  href,
  icon,
  active,
}: {
  label: string;
  href: string;
  icon: string;
  active?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`relative flex flex-1 flex-col items-center justify-center gap-1.5 px-1.5 pb-2.5 pt-2 text-[11px] font-bold transition-colors ${
        active ? "text-white" : "text-white/60"
      } ${
        active
          ? "before:absolute before:left-1/2 before:top-0 before:h-[3px] before:w-7 before:-translate-x-1/2 before:rounded-full before:bg-gradient-to-r before:from-brand-soft before:to-brand-dark"
          : ""
      }`}
    >
      <span className="flex h-6 w-6 items-center justify-center text-lg leading-none">
        {icon}
      </span>
      <span className="max-w-full truncate">{label}</span>
    </Link>
  );
}
