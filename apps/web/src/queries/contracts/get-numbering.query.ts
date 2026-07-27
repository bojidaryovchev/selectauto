import { sql } from "drizzle-orm";
import { getAdminSession } from "@/lib/admin";
import { getDb, schema } from "@/lib/db";

/** The two independent document series (spec §14 — deposits number separately). */
export type NumberSeries = "contract" | "deposit";

export type NumberingRow = {
  series: NumberSeries;
  year: number;
  /** The number the NEXT generated document will get, e.g. "2026-094". */
  nextNumber: string;
  /** Same thing as a plain integer, for the edit field. */
  nextNo: number;
  /** Highest number already used this year, or null when none exist yet. */
  highestUsed: string | null;
};

/** Current year in Europe/Sofia — the business's year, not the server's. */
export function currentSofiaYear(): number {
  return Number(new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Sofia", year: "numeric" }).format(new Date()));
}

/**
 * The numbering state for one series, for the /admin editor. Reads the counter
 * (which holds the LAST used number) and the highest number actually present, so
 * the admin can see both "what comes next" and "what's already taken".
 * Admin-only — numbering drives legal document identifiers.
 */
export async function getNumbering(series: NumberSeries, year = currentSofiaYear()): Promise<NumberingRow> {
  if (!(await getAdminSession())) throw new Error("FORBIDDEN");

  const db = getDb();
  const counter = await db.execute(
    sql`SELECT last_no FROM contract_counters WHERE series = ${series} AND year = ${year}`,
  );
  const lastNo = Number((counter.rows[0] as { last_no: number | string } | undefined)?.last_no ?? 0);

  const table = series === "contract" ? schema.contracts : schema.depositContracts;
  const highest = await db.execute(
    sql`SELECT MAX(number) AS m FROM ${table} WHERE number LIKE ${`${year}-%`}`,
  );

  const nextNo = lastNo + 1;
  return {
    series,
    year,
    nextNo,
    nextNumber: `${year}-${String(nextNo).padStart(3, "0")}`,
    highestUsed: ((highest.rows[0] as { m: string | null } | undefined)?.m ?? null) as string | null,
  };
}
