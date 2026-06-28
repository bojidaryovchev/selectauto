import type { ReactNode } from "react";

/** Numbered feature card used across the About page (dark/orange/light variants). */
export function FeatureCard({
  variant,
  number,
  title,
  children,
}: {
  variant: "dark" | "orange" | "light";
  number?: string;
  title: string;
  children: ReactNode;
}) {
  const surface =
    variant === "dark"
      ? "bg-[linear-gradient(135deg,#0c0d10,#15171c)] text-white"
      : variant === "orange"
        ? "bg-[linear-gradient(135deg,#c55d00,#df7a10)] text-white"
        : "bg-white text-[#17181b]";

  return (
    <article
      className={`relative flex h-full min-h-[300px] flex-col overflow-hidden rounded-[28px] px-[26px] py-[30px] shadow-[0_18px_50px_rgba(0,0,0,0.14)] transition-transform duration-300 hover:-translate-y-1.5 max-md:min-h-0 ${surface}`}
    >
      {number && (
        <span className="mb-5 block text-[54px] font-black leading-none max-md:text-[44px]">
          {number}
        </span>
      )}
      <h3 className="mb-4 text-[32px] font-black leading-[1.05] max-md:text-[28px]">
        {title}
      </h3>
      <p className="m-0 text-lg leading-[1.85] max-md:text-base">{children}</p>
    </article>
  );
}
