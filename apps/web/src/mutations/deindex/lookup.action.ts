"use server";

import { getAdminSession } from "@/lib/admin";
import { lookupDeindexCandidates } from "@/queries/deindex";
import type { ActionResult } from "@/types/action-result.type";
import type { LookupResult } from "@/queries/deindex";

/**
 * Server action wrapper around the candidate lookup, so the admin form can
 * search without a full page navigation.
 *
 * `.action.ts`, not `.mutation.ts` — the repo reserves the `.mutation.ts` suffix
 * for WRITES, and this only reads. Still gated: a server action is a public POST
 * endpoint regardless of which page renders the form, and this one would
 * otherwise let anyone resolve a VIN to the vehicle's history.
 */
export async function lookupForDeindex(query: string): Promise<ActionResult<LookupResult>> {
  if (!(await getAdminSession())) {
    return { success: false, error: "Нямате достъп до тази операция." };
  }
  try {
    return { success: true, data: await lookupDeindexCandidates(query) };
  } catch (error) {
    console.error("[deindex] lookup failed", error);
    return { success: false, error: "Търсенето не бе успешно." };
  }
}
