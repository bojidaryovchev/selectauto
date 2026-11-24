"use client";

import type { ReactNode } from "react";
import { RememberAuthMethod } from "@/components/auth";
import { SiteToaster } from "@/components/layout/site-toaster";
import { FavoritesProvider } from "@/contexts/favorites-context";

/**
 * Composes all client-side context providers mounted once at the root layout:
 * the favourites state (the inquiry modal's provider went with the modal: every
 * „Запитване" is a link to /zapitvane now, owner decision 41). New providers nest here so
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
 * <RememberAuthMethod> is a render-nothing singleton that records which sign-in
 * method minted the current session (for the "last used" badge on /sign-in). It
 * belongs here rather than on the sign-in page because the Google flow redirects
 * the browser away and lands the user on `redirectTo` — anywhere in the app.
 *
 * The single app-wide notification renderer, <SiteToaster> (react-hot-toast's
 * headless hook), also lives here. It renders via effects/state, so it must sit
 * inside this "use client" boundary — not in the server-rendered root layout.
 */
export function Providers({ children }: { children: ReactNode }) {
  return (
    <FavoritesProvider>
      {children}

      <RememberAuthMethod />

      <SiteToaster />
    </FavoritesProvider>
  );
}
