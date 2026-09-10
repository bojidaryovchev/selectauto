"use server";

import { getAdminSession } from "@/lib/admin";
import type { DictOption } from "@/lib/mobilebg/dictionary";
import type { MobilebgOverrides } from "@/lib/mobilebg/map-car";
import {
  type CarLookupHit,
  type MobilebgPreview,
  getMobilebgModelOptions,
  getMobilebgPreview,
  lookupCarForMobilebg,
} from "@/queries/mobilebg";
import type { ActionResult } from "@/types/action-result.type";

/**
 * Server-action wrappers for the reads the publish desk does interactively —
 * finding a car, recomputing the advert as the admin edits the overrides, and
 * loading a brand's model list for the mapping picker.
 *
 * `.action.ts`, not `.mutation.ts`: the repo reserves that suffix for writes and
 * none of these write. Still admin-gated — a server action is a public POST
 * endpoint no matter which page renders the form.
 */

export async function lookupCarAction(query: string): Promise<ActionResult<CarLookupHit[]>> {
  if (!(await getAdminSession())) return { success: false, error: "Нямате достъп до тази операция." };
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
  if (!(await getAdminSession())) return { success: false, error: "Нямате достъп до тази операция." };
  try {
    const preview = await getMobilebgPreview(carId, overrides);
    if (!preview) return { success: false, error: "Автомобилът не е намерен или е скрит." };
    return { success: true, data: preview };
  } catch (error) {
    console.error("[mobilebg] preview failed", carId, error);
    return { success: false, error: "Не успяхме да съставим обявата." };
  }
}

export async function modelOptionsAction(marka: string): Promise<ActionResult<DictOption[]>> {
  if (!(await getAdminSession())) return { success: false, error: "Нямате достъп до тази операция." };
  try {
    return { success: true, data: await getMobilebgModelOptions(marka) };
  } catch (error) {
    console.error("[mobilebg] model options failed", marka, error);
    return { success: false, error: "Списъкът с модели не бе зареден." };
  }
}
