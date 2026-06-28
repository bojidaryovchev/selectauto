import type { ReactNode } from "react";

/** Labelled field wrapper with an inline validation message. */
export function FormField({
  id,
  label,
  error,
  children,
}: {
  id: string;
  label: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div className="grid gap-2">
      <label htmlFor={id} className="text-sm font-extrabold text-[#17181b]">
        {label}
      </label>
      {children}
      {error && (
        <span className="text-[13px] font-semibold leading-snug text-[#b53b2f]">
          {error}
        </span>
      )}
    </div>
  );
}
