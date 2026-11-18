import type { ReactNode } from "react";

/**
 * A social profile in the about page's „Следвайте ни" (board `in-za-nas`): a 48 px kit icon button that opens the
 * profile in a new tab. Pass the brand icon as `children`; `label` is its name for screen readers.
 */
export function SocialLink({ href, label, children }: { href: string; label: string; children: ReactNode }) {
  return (
    <a href={href} aria-label={label} target="_blank" rel="noopener noreferrer" className="sa-ib sa-ib--lg">
      {children}
    </a>
  );
}
