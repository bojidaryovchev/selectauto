"use server";

import { getAdminSession } from "@/lib/admin";
import { diffTariffs, type TariffDiff } from "@/lib/tariff-diff";
import { parseTariffText } from "@/lib/tariff-parse";
import { getTariffBaseline } from "@/queries/tariffs";
import type { ActionResult } from "@/types/action-result.type";

export type TariffCheck = {
  /** The pasted table's size. */
  inlandRows: number;
  containerRows: number;
  /** The table it would replace: an upload (with its date) or the built-in one. */
  baseline: { createdAt: Date | null; inlandRows: number; containerRows: number };
  diff: TariffDiff;
};

/**
 * Parses a tariff paste and compares it with the active table, without saving
 * anything — what /admin/tarifi shows before „Запази и активирай". The same
 * parse the upload runs, so a paste that passes here is accepted there.
 *
 * `.action.ts`: it writes nothing. Still admin-gated — a server action is a
 * public POST endpoint whichever page renders the form.
 */
export async function checkTariffsAction(input: {
  inlandTsv: string;
  containerTsv: string;
}): Promise<ActionResult<TariffCheck>> {
  if (!(await getAdminSession())) return { success: false, error: "Нямате достъп до тази операция." };

  const inlandTsv = input?.inlandTsv ?? "";
  const containerTsv = input?.containerTsv ?? "";
  if (!inlandTsv.trim() || !containerTsv.trim()) {
    return { success: false, error: "Поставете и двете таблици — транспортна и контейнерна." };
  }

  let parsed;
  try {
    parsed = parseTariffText({ inlandTsv, containerTsv });
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Неуспешно разчитане на поставените данни.",
    };
  }

  try {
    const baseline = await getTariffBaseline();
    const containerRows = Object.values(baseline.data.container).reduce((n, m) => n + Object.keys(m).length, 0);
    return {
      success: true,
      data: {
        inlandRows: parsed.inlandRows,
        containerRows: parsed.containerRows,
        baseline: {
          createdAt: baseline.source === "upload" ? baseline.createdAt : null,
          inlandRows: baseline.data.inland.length,
          containerRows,
        },
        diff: diffTariffs(baseline.data, parsed.data),
      },
    };
  } catch (error) {
    console.error("[check-tariffs] reading the active table failed", error);
    return { success: false, error: "Активната таблица не можа да бъде прочетена. Моля опитайте отново." };
  }
}
