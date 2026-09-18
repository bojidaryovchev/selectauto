"use server";

import { getBackOfficeSession } from "@/lib/admin";
import type { MobilebgOverrides } from "@/lib/mobilebg/map-car";
import {
  type CarLookupHit,
  type MobilebgPreview,
  getMobilebgPreview,
  lookupCarForMobilebg,
} from "@/queries/mobilebg";
import type { ActionResult } from "@/types/action-result.type";

/**
 * Server-action wrappers for the reads the publish desk does interactively —
 * finding a car, and recomputing the advert as the admin edits the overrides or
 * picks a brand/model.
 *
 * `.action.ts`, not `.mutation.ts`: the repo reserves that suffix for writes and
 * neither of these writes. Still gated to the back office: a server action is a
 * public POST endpoint no matter which page renders the form.
 */

export async function lookupCarAction(query: string): Promise<ActionResult<CarLookupHit[]>> {
  if (!(await getBackOfficeSession())) return { success: false, error: "Нямате достъп до тази операция." };
  try {
    return { success: true, data: await lookupCarForMobilebg(query) };
  } catch (error) {
    console.error("[mobilebg] lookup failed", error);
    return { success: false, error: "Търсенето не бе успешно." };
  }
}

export async function previewAdvertAction(
  carId: number,
  overrides?: MobilebgOverrides,
): Promise<ActionResult<MobilebgPreview>> {
  if (!(await getBackOfficeSession())) return { success: false, error: "Нямате достъп до тази операция." };
  try {
    const preview = await getMobilebgPreview(carId, overrides);
    if (!preview) return { success: false, error: "Автомобилът не е намерен или е скрит." };
    return { success: true, data: preview };
  } catch (error) {
    console.error("[mobilebg] preview failed", carId, error);
    return { success: false, error: "Не успяхме да съставим обявата." };
  }
}
