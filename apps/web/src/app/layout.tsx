import { PublicWidgets, ScrollToTop } from "@/components/layout";
import { Providers } from "@/components/providers";
import { SITE_NAME, SITE_URL } from "@/constants";
import { buildOrganizationJsonLd, buildWebsiteJsonLd } from "@/lib/site-jsonld";
import { Analytics } from "@vercel/analytics/next";
import type { Metadata, Viewport } from "next";
import { SessionProvider } from "next-auth/react";
import { JetBrains_Mono, Manrope, Montserrat, Unbounded } from "next/font/google";
import { Suspense } from "react";
import "./globals.css";

// The „Нощно шосе" type (docs/design/README.md). All three are variable fonts,
// so every weight comes from one file per subset. Their CSS variables feed
// font-sans, font-display and font-mono in src/styles/tokens.css.
// Manrope: all interface text.
const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin", "cyrillic"],
  display: "swap",
});
// Unbounded: display, page and section titles, and prices.
const unbounded = Unbounded({
  variable: "--font-unbounded",
  subsets: ["latin", "cyrillic"],
  display: "swap",
});
// JetBrains Mono: VIN, lot № and countdown digits only. Its Cyrillic letters
// have no Bulgarian forms, so only the Latin subset is loaded, and it is not
// preloaded because it only sets short codes.
const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  display: "swap",
  preload: false,
});

// Montserrat, the old site face, stays only for the /proces particle title:
// components/three/particle-process.tsx draws it on a canvas from the
// --font-montserrat variable. Remove it when /proces is rebuilt.
const montserrat = Montserrat({
  variable: "--font-montserrat",
  subsets: ["latin", "cyrillic"],
  weight: ["400", "500", "600", "700", "800", "900"],
  display: "swap",
});

export const metadata: Metadata = {
  // Absolute base for all relative canonical/OG URLs across the app. Lets child
  // pages set `alternates.canonical: "/path"` and OG images by relative path and
  // have Next resolve them against the production origin.
  metadataBase: new URL(SITE_URL),
  // No title.template: every page already sets a fully-branded title (e.g.
  // "Контакти — SelectAuto", "… | SelectAuto"), so a template would double the
  // brand suffix. This `default` only applies to pages with no title of their own.
  title: "SelectAuto — Намираме точните автомобили за точните хора",
  description:
    "SelectAuto не е просто каталог. Това е процес, опит и реално съдействие — от подбора и участието в търг до логистиката и предаването на ключ.",
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    locale: "bg_BG",
    url: SITE_URL,
    images: [{ url: "/og-cover.png", width: 1200, height: 630, alt: SITE_NAME }],
  },
};

// Mobile browser-chrome colour = the night ground (`bg`, #0C0D10). The site is
// dark-only, so `colorScheme` is dark: native controls and scrollbars match it.
export const viewport: Viewport = {
  themeColor: "#0c0d10",
  colorScheme: "dark",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Site-wide structured data: the AutoDealer/Organization entity + the WebSite
  // (with a SearchAction). Emitted once here so every page carries the brand /
  // NAP / sitelinks-search-box signals. Per-page schema (Vehicle/Product on the
  // detail page, FAQPage on the calculator, Breadcrumb/ItemList on the catalog)
  // is added in those routes and references this entity via @id.
  const orgJsonLd = buildOrganizationJsonLd();
  const websiteJsonLd = buildWebsiteJsonLd();

  return (
    <html
      lang="bg"
      className={`${manrope.variable} ${unbounded.variable} ${jetbrainsMono.variable} ${montserrat.variable} h-full`}
    >
      {/* Bottom padding on mobile reserves space for the fixed <MobileBottomNav>
          (≈62px tab bar + the iOS home-indicator safe area) so page content and
          the footer are never hidden behind it. Removed at lg where the bar is
          `lg:hidden`. */}
      <body className="flex min-h-full flex-col pb-[calc(var(--bottom-nav)+env(safe-area-inset-bottom))] lg:pb-0">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(orgJsonLd) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd) }}
        />

        {/* Reads usePathname → needs a Suspense boundary under cacheComponents on
            routes with a dynamic param (e.g. /avtomobil/[id]). Renders null. */}
        <Suspense fallback={null}>
          <ScrollToTop />
        </Suspense>

        {/* Auth.js SessionProvider makes the session available to client hooks
            (`useSession`) app-wide — the header auth controls + the favourites
            provider use it. It's a CLIENT provider that fetches the session via
            /api/auth/session, so it does NOT read request headers during render and
            does NOT force the static shell dynamic under cacheComponents — no
            Suspense wrapper needed around it. */}
        <SessionProvider>
          <Providers>{children}</Providers>
        </SessionProvider>

        {/* The floating Viber-group CTA (reveals on scroll-down, hides on
            scroll-up, dismissable for the session) and the "back to top" button
            (reveals past ~one viewport, lifted above the mobile bottom nav) —
            public pages only: PublicWidgets renders nothing under /admin. It
            reads usePathname, so it needs a Suspense boundary like ScrollToTop. */}
        <Suspense fallback={null}>
          <PublicWidgets />
        </Suspense>

        {/* Vercel Web Analytics: page views + custom events, billed at $0.03/1K
            events. The ONLY Vercel telemetry we keep. Speed Insights was removed
            (a flat $10/mo per-project base fee on top of per-event charges, for
            CWV data we already get from Search Console / PageSpeed), and
            Observability Plus — the biggest line item at ~$0.93/day — is switched
            off team-side in Billing settings; it has no code surface. */}
        <Analytics />
      </body>
    </html>
  );
}
