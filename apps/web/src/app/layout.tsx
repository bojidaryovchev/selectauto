import type { Metadata } from "next";
import { Montserrat } from "next/font/google";
import { Suspense } from "react";
import { ScrollToTop } from "@/components/layout";
import { Providers } from "@/components/providers";
import "./globals.css";

const montserrat = Montserrat({
  variable: "--font-montserrat",
  subsets: ["latin", "cyrillic"],
  weight: ["400", "500", "600", "700", "800", "900"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "SelectAuto — Намираме точните автомобили за точните хора",
  description:
    "SelectAuto не е просто каталог. Това е процес, опит и реално съдействие — от подбора и участието в търг до логистиката и предаването на ключ.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="bg" className={`${montserrat.variable} h-full`}>
      <body className="flex min-h-full flex-col bg-white text-ink">
        {/* Reads usePathname → needs a Suspense boundary under cacheComponents on
            routes with a dynamic param (e.g. /avtomobil/[id]). Renders null. */}
        <Suspense fallback={null}>
          <ScrollToTop />
        </Suspense>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
