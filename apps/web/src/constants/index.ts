import type { LinkItem } from "@/types/nav.type";

/** Primary contact details, shown in the header, footer and contacts page. */
export const CONTACT = {
  phone: "+359 898 980 011",
  phoneHref: "tel:+359898980011",
  email: "info@selectauto.bg",
  emailHref: "mailto:info@selectauto.bg",
} as const;

/** Social profiles, verbatim from the site footer. */
export const SOCIALS: LinkItem[] = [
  { label: "Facebook", href: "https://www.facebook.com/SelectAuto.bg/" },
  { label: "Instagram", href: "https://www.instagram.com/selectauto.bg" },
  { label: "TikTok", href: "https://www.tiktok.com/@selectauto.bg" },
  {
    label: "Viber",
    href: "https://invite.viber.com/?g2=AQBHAJSWFG7zmFY40zbZAiy2neG7t4Y%2BzZIKiOYHSvhDZZV9wFmtnX6E0lEhIF2Q",
  },
];
