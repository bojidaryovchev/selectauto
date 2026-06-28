import { Reveal } from "./reveal";

/**
 * The eyebrow pill + heading + subtitle block that headed nearly every section
 * on the site (home, carfax, contacts, about). Centralized so the spacing,
 * type scale and the orange eyebrow chip stay consistent. Wrapped in <Reveal>
 * to keep the original scroll-in behaviour.
 *
 * `tone` switches the copy colours for dark backgrounds (the carfax/contacts
 * heroes render on imagery), defaulting to the light-background palette used on
 * the homepage.
 */
export function SectionHeader({
  eyebrow,
  title,
  subtitle,
  tone = "light",
  className = "",
}: {
  eyebrow: string;
  title: string;
  subtitle?: string;
  tone?: "light" | "dark";
  className?: string;
}) {
  const titleColor = tone === "dark" ? "text-white" : "text-ink";
  const subtitleColor = tone === "dark" ? "text-white/[0.78]" : "text-[#555]";

  return (
    <Reveal className={`mx-auto mb-[38px] max-w-[900px] text-center ${className}`}>
      <span className="inline-flex items-center justify-center rounded-full bg-brand/10 px-[18px] py-2.5 text-xs font-extrabold uppercase tracking-[0.1em] text-brand-dark">
        {eyebrow}
      </span>
      <h2
        className={`mb-3 mt-4 text-[clamp(32px,4vw,58px)] font-black leading-[1.04] ${titleColor}`}
      >
        {title}
      </h2>
      {subtitle && (
        <p className={`m-0 text-lg font-medium leading-[1.7] ${subtitleColor}`}>
          {subtitle}
        </p>
      )}
    </Reveal>
  );
}
