"use server";

import { getFavoriteCarIds } from "@/queries/favorites";

/**
 * Server Action exposing the signed-in user's favourite car ids to the client
 * FavoritesProvider, which fetches them on mount to seed heart state.
 *
 * Why an action rather than passing them down from a server component: seeding
 * server-side would mean calling `auth()` in the root layout, which (reading
 * request headers) forces the whole static shell dynamic under cacheComponents.
 * Fetching client-side on mount keeps every page's static shell intact. Returns
 * `[]` when signed out (getFavoriteCarIds already guards this).
 */
export async function getMyFavoriteIds(): Promise<number[]> {
  return getFavoriteCarIds();
}
