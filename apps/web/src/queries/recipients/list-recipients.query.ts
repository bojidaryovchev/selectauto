import { asc } from "drizzle-orm";
import { getBackOfficeSession } from "@/lib/admin";
import { getDb, schema } from "@/lib/db";

export type RecipientRow = typeof schema.paymentRecipients.$inferSelect;

/**
 * All payment recipients for the /admin/poluchateli settings screen, grouped by
 * kind then name. NOT cached (request-scoped, admin-only, tiny table — same
 * reasoning as the lead-inbox queries). Admin-gated defensively (the page +
 * proxy already gate).
 */
export async function listRecipients(): Promise<RecipientRow[]> {
  if (!(await getBackOfficeSession())) throw new Error("FORBIDDEN");

  const t = schema.paymentRecipients;
  return getDb().select().from(t).orderBy(asc(t.kind), asc(t.name));
}
