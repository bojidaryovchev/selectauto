"use server";

import { sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getAdminSession } from "@/lib/admin";
import { getDb, schema } from "@/lib/db";
import { currentSofiaYear, type NumberSeries } from "@/queries/contracts";
import type { ActionResult } from "@/types/action-result.type";

export type SetNextNumberInput = {
  series: NumberSeries;
  /** The number the next generated document should get, e.g. 94. */
  nextNo: number;
  year?: number;
};

/**
 * ADMIN-ONLY: set where a document series continues from — e.g. after issuing a
 * contract on paper, or to align the system with the existing register.
 *
 * The counter stores the LAST used number, so a requested "next = 94" is stored
 * as 93. The chosen number must not already exist (a duplicate would break the
 * UNIQUE index at creation time); minting additionally skips taken numbers, so
 * even a careless setting can't wedge contract creation. The change is audited
 * (§9) — numbering identifies legal documents.
 */
export async function setNextNumber(input: SetNextNumberInput): Promise<ActionResult<{ nextNumber: string }>> {
  const session = await getAdminSession();
  if (!session) return { success: false, error: "Нямате достъп до тази операция." };

  const series = input?.series;
  if (series !== "contract" && series !== "deposit") {
    return { success: false, error: "Невалидна серия." };
  }
  const year = input?.year ?? currentSofiaYear();
  if (!Number.isInteger(year) || year < 2000 || year > 2100) {
    return { success: false, error: "Невалидна година." };
  }
  const nextNo = Number(input?.nextNo);
  if (!Number.isInteger(nextNo) || nextNo < 1 || nextNo > 99999) {
    return { success: false, error: "Номерът трябва да е цяло число между 1 и 99999." };
  }

  const nextNumber = `${year}-${String(nextNo).padStart(3, "0")}`;
  const db = getDb();

  try {
    // Refuse a number that's already issued — the admin should pick a free one.
    const table = series === "contract" ? schema.contracts : schema.depositContracts;
    const taken = await db.execute(sql`SELECT 1 FROM ${table} WHERE number = ${nextNumber} LIMIT 1`);
    if (taken.rows.length > 0) {
      return { success: false, error: `Номер ${nextNumber} вече е използван. Изберете свободен номер.` };
    }

    await db.transaction(async (tx) => {
      await tx.execute(
        sql`INSERT INTO contract_counters (series, year, last_no) VALUES (${series}, ${year}, ${nextNo - 1})
            ON CONFLICT (series, year) DO UPDATE SET last_no = ${nextNo - 1}`,
      );
      await tx.insert(schema.contractEvents).values({
        // Not tied to a row — `entity_id` carries the year so the trail reads
        // "numbering/2026 changed".
        entity: "numbering",
        entityId: year,
        action: "updated",
        actorId: session.user?.id ?? null,
        data: { series, year, nextNumber },
      });
    });

    revalidatePath("/admin", "layout");
    return { success: true, data: { nextNumber } };
  } catch (error) {
    console.error("[set-next-number] failed", error);
    return { success: false, error: "Възникна грешка при запазването. Моля опитайте отново." };
  }
}
