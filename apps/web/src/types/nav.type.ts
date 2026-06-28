/** A top-level navigation entry, optionally with a dropdown of children. */
export type NavItem = {
  label: string;
  href: string;
  children?: { label: string; href: string }[];
};

/** A simple labelled link (footer columns, socials). */
export type LinkItem = {
  label: string;
  href: string;
};
