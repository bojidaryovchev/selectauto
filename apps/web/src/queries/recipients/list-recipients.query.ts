import { asc } from "drizzle-orm";
import { getSessionWith } from "@/lib/admin";
import { getDb, schema } from "@/lib/db";

export type RecipientRow = typeof schema.paymentRecipients.$inferSelect;

/**
 * All payment recipients, grouped by kind then name — for the /admin/poluchateli
 * settings screen (admin-only) and the notice panel of a contract's page, which
 * observers reach too; hence the back-office gate. NOT cached (request-scoped,
 * tiny table — same reasoning as the lead-inbox queries).
 */
export async function listRecipients(): Promise<RecipientRow[]> {
  if (!(await getSessionWith("backoffice.enter"))) throw new Error("FORBIDDEN");

  const t = schema.paymentRecipients;
  return getDb().select().from(t).orderBy(asc(t.kind), asc(t.name));
}
