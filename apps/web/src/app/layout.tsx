import type { Metadata } from "next";
import { Montserrat } from "next/font/google";
import { Suspense } from "react";
import { SessionProvider } from "next-auth/react";
import { BackToTop, ScrollToTop, ViberGroupPopup } from "@/components/layout";
import { Providers } from "@/components/providers";
import { SITE_NAME, SITE_URL } from "@/constants";
import { buildOrganizationJsonLd, buildWebsiteJsonLd } from "@/lib/site-jsonld";
import "./globals.css";

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
    images: ["/autoselect.jpg"],
  },
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
    <html lang="bg" className={`${montserrat.variable} h-full`}>
      {/* Bottom padding on mobile reserves space for the fixed <MobileBottomNav>
          (≈62px tab bar + the iOS home-indicator safe area) so page content and
          the footer are never hidden behind it. Removed at lg where the bar is
          `lg:hidden`. */}
      <body className="flex min-h-full flex-col bg-white pb-[calc(62px+env(safe-area-inset-bottom))] text-ink lg:pb-0">
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

        {/* Floating Viber-group CTA: reveals on scroll-down, hides on scroll-up,
            dismissable for the session. Self-contained client singleton — no
            usePathname, so (unlike ScrollToTop) it needs no Suspense boundary. */}
        <ViberGroupPopup />

        {/* Floating "back to top" button: reveals once scrolled past ~one
            viewport, smooth-scrolls to the top on click. Self-contained client
            singleton, lifted above the mobile bottom nav. */}
        <BackToTop />
      </body>
    </html>
  );
}
