import { pixelBasedPreset } from "react-email";

/**
 * Shared design tokens + config for the transactional/notification emails.
 *
 * The colour scale is copied verbatim from the site's `@theme` block in
 * `globals.css` (the ported `--sa-*` variables) so the emails read as the same
 * brand as the website. It's fed to react-email's `<Tailwind>` component, which
 * compiles the utility classes we use in the templates down to inline styles at
 * render time (email clients strip <style>/classes, so everything must inline).
 *
 * `pixelBasedPreset` rewrites Tailwind's default `rem` spacing/sizing to `px`
 * because several email clients (notably Outlook) don't honour `rem`.
 */
export const emailTailwindConfig = {
  presets: [pixelBasedPreset],
  theme: {
    extend: {
      colors: {
        brand: "#d86f16",
        "brand-dark": "#b95200",
        "brand-soft": "#f5a14b",
        "brand-glow": "#ff8a3d",
        ink: "#222222",
        "ink-strong": "#111111",
        muted: "#666666",
        line: "#e8e8e8",
        shell: "#0f1014",
        "shell-soft": "#121317",
        success: "#1eb960",
      },
      fontFamily: {
        // Montserrat is the site face (loaded via next/font on the web). Email
        // clients rarely load custom fonts, so we lead with Montserrat for the
        // few that have it and fall back to the platform sans everywhere else.
        sans: [
          "Montserrat",
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "Roboto",
          "Helvetica",
          "Arial",
          "sans-serif",
        ],
      },
    },
  },
};

/**
 * Base URL for absolute links/images inside emails (the logo `<Img>` and CTA
 * buttons). Emails can't use relative paths, so every asset needs the full
 * origin. Mirrors the resolution the auth links use: explicit APP_URL override
 * first, then the production domain. Trailing slash trimmed.
 */
export function emailBaseUrl(): string {
  return (process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || "https://www.selectauto.bg").replace(
    /\/$/,
    "",
  );
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
