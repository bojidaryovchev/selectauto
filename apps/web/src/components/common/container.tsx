import type { ReactNode } from "react";

/**
 * Centered page container — the `w-[min(100%-28px,1280px)] mx-auto` wrapper that
 * was repeated in every section across the site. `className` is appended so
 * callers can add vertical spacing or alignment.
 */
export function Container({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`mx-auto w-[min(100%-28px,1280px)] ${className}`}>
      {children}
    </div>
  );
}
