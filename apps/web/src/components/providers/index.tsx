"use client";

import type { ReactNode } from "react";
import { Toaster } from "react-hot-toast";
import { FavoritesProvider } from "@/contexts/favorites-context";
import { InquiryProvider } from "@/contexts/inquiry-context";

/**
 * Composes all client-side context providers mounted once at the root layout:
 * the inquiry modal + the favourites state. New providers nest here so
 * `layout.tsx` stays a single `<Providers>` wrap — the same pattern as the
 * ecommerce-store reference app.
 *
 * FavoritesProvider self-seeds CLIENT-SIDE (it fetches the signed-in user's
 * favourite ids on mount). We deliberately do NOT fetch them server-side in the
 * layout: `auth()` reads request headers, which under cacheComponents would force
 * the whole static shell dynamic and require a Suspense boundary around the app.
 * Seeded once at the root, the homepage carousels, catalog grid, detail page, and
 * /lyubimi all share one synced set.
 *
 * The single app-wide react-hot-toast <Toaster> also lives here (top-right).
 * react-hot-toast renders via effects/state, so it must sit inside this
 * "use client" boundary — not in the server-rendered root layout. Defaults are
 * themed to the brand (rounded, white, orange success accent) rather than the
 * library's dark pill.
 */
export function Providers({ children }: { children: ReactNode }) {
  return (
    <FavoritesProvider>
      <InquiryProvider>{children}</InquiryProvider>

      <Toaster
        position="top-right"
        gutter={10}
        toastOptions={{
          duration: 2200,
          style: {
            borderRadius: "14px",
            background: "#ffffff",
            color: "#191b20",
            fontSize: "14px",
            fontWeight: 700,
            padding: "12px 16px",
            border: "1px solid #e8e8e8",
            boxShadow: "0 12px 30px rgba(0,0,0,0.1)",
          },
          success: { iconTheme: { primary: "#d86f16", secondary: "#ffffff" } },
        }}
      />
    </FavoritesProvider>
  );
}
