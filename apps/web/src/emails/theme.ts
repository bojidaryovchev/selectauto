import { pixelBasedPreset } from "react-email";

/**
 * Shared design tokens + config for the transactional/notification emails.
 *
 * The palette is the boards' e-mail palette (main canvas, page „Имейли и документи", `ms-base`): a light card on a
 * pale desk, the night band behind the logo, the orange of the site for the button only, and its dark orange for
 * links and the eyebrow. Fixed hex values, contrast measured on white. It's fed to react-email's `<Tailwind>`
 * component, which compiles the utility classes we use in the templates down to inline styles at render time (email
 * clients strip <style>/classes, so everything must inline); the phone rules (`max-[480px]:`) stay as one media query
 * in the head.
 *
 * `pixelBasedPreset` rewrites Tailwind's default `rem` spacing/sizing to `px`
 * because several email clients (notably Outlook) don't honour `rem`. It lists only some steps (0.5 … 96 and the text
 * sizes); any other step (`w-33`, `px-4.5`) still compiles to rem, so the templates write other sizes as arbitrary px
 * values (`w-[132px]`).
 *
 * The default export is the same object, for the linter: `tailwind.css` loads it with `@config`.
 */
export const emailTailwindConfig = {
  presets: [pixelBasedPreset],
  theme: {
    extend: {
      colors: {
        /** Headings, values, the total. */
        ink: "#15171B",
        /** Body text. */
        body: "#2A2E35",
        /** Secondary text, labels, the footer. */
        muted: "#4A4F57",
        /** Lines that don't add up to the total („Междинна сума"). */
        faint: "#6B7079",
        line: "#E3E6EA",
        "line-dash": "#D3D7DC",
        /** The page behind the card. */
        desk: "#EEF0F3",
        /** The total, the VIN. */
        panel: "#F3F4F6",
        foot: "#F6F7F9",
        /** The band behind the logo (the logo is gold on transparent). */
        night: "#0C0D10",
        /** The button: dark text on it, 7.5:1. */
        orange: "#FF7A1A",
        /** Links and the eyebrow on white, 6.1:1. */
        ortx: "#A84300",
        photo: "#E9ECEF",
      },
      fontFamily: {
        // Manrope is the site's text face (loaded by next/font on the web). Email clients rarely load custom fonts
        // and hot-linking one would send every reader's address to a font host, so none is loaded: Manrope leads for
        // the few readers who have it, then the platform sans.
        sans: [
          "Manrope",
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "Roboto",
          "Helvetica",
          "Arial",
          "sans-serif",
        ],
        mono: ["JetBrains Mono", "ui-monospace", "SFMono-Regular", "Consolas", "Menlo", "monospace"],
      },
    },
  },
};

export default emailTailwindConfig;

/**
 * Base URL for absolute links/images inside emails (the logo `<Img>` and CTA
 * buttons). Emails can't use relative paths, so every asset needs the full
 * origin. Mirrors the resolution the auth links use: explicit APP_URL override
 * first, then the production domain. Trailing slash trimmed.
 */
export function emailBaseUrl(): string {
  return (process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || "https://www.selectauto.bg").replace(/\/$/, "");
}

/**
 * Formats an ISO timestamp for the internal notification emails as a readable
 * Bulgarian date/time in the showroom's timezone (Europe/Sofia). Falls back to
 * the raw string if it isn't a valid date.
 */
export function formatBgDateTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return new Intl.DateTimeFormat("bg-BG", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Europe/Sofia",
  }).format(date);
}
