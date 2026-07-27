import { asc } from "drizzle-orm";
import { getBackOfficeSession } from "@/lib/admin";
import { getDb, schema } from "@/lib/db";

export type ClientRow = typeof schema.clients.$inferSelect;

/**
 * All clients for the contract-creation wizard's "existing client" picker,
 * ordered by name. Deliberately unpaginated: clients accrue at deal pace (a few
 * hundred a year at most), so shipping the full list to the admin form and
 * filtering client-side beats a search round-trip. NOT cached (request-scoped,
 * admin-only). Admin-gated defensively.
 */
export async function listClients(): Promise<ClientRow[]> {
  if (!(await getBackOfficeSession())) throw new Error("FORBIDDEN");

  const t = schema.clients;
  return getDb().select().from(t).orderBy(asc(t.name));
}
