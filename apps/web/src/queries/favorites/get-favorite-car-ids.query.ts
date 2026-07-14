import { eq } from "drizzle-orm";
import { auth } from "@/auth";
import { getDb, schema } from "@/lib/db";

/**
 * The set of car ids the signed-in user has favourited. Used to SEED heart state
 * across the catalog: the page fetches this once and hands it to a client
 * FavoritesProvider, so each virtualized card knows its initial filled/empty
 * state without a per-card query (the grid is virtualized — per-card server reads
 * aren't possible there).
 *
 * Returns an empty array when signed out (the catalog is public; hearts render
 * empty and a click prompts sign-in). NOT cached — it's per-user, request-scoped
 * data (caching it under `cacheComponents` would risk leaking one user's set to
 * another), and it's a single index scan on favorites_user_idx so it's cheap.
 */
export async function getFavoriteCarIds(): Promise<number[]> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return [];

  const rows = await getDb()
    .select({ carId: schema.favorites.carId })
    .from(schema.favorites)
    .where(eq(schema.favorites.userId, userId));

  return rows.map((r) => r.carId);
}
