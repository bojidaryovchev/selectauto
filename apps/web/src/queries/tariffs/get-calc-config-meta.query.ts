import { getAdminSession } from "@/lib/admin";
import { getDb, schema } from "@/lib/db";
import { desc, sql } from "drizzle-orm";

/** When the calculator settings were last saved, and by whom (name, else e-mail). */
export type CalcConfigMeta = { updatedAt: Date; updatedByName: string | null };

/**
 * Admin-only: the newest `calculator_settings` row's save time and author — null
 * while the calculator still runs on the built-in defaults. Uncached.
 */
export async function getCalcConfigMeta(): Promise<CalcConfigMeta | null> {
  if (!(await getAdminSession())) throw new Error("FORBIDDEN");

  const s = schema.calculatorSettings;
  const [row] = await getDb()
    .select({
      updatedAt: s.updatedAt,
      updatedByName: sql<string | null>`(SELECT coalesce(u.name, u.email) FROM users u WHERE u.id = ${s.updatedBy})`,
    })
    .from(s)
    .orderBy(desc(s.id))
    .limit(1);
  return row ?? null;
}
