"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getDb, schema } from "@/lib/db";
import { getAdminSession } from "@/lib/admin";
import { isLeadStatus, isLeadType, type LeadType } from "@/constants/admin";
import type { ActionResult } from "@/types/action-result.type";

/** The Drizzle table for a lead type — the three tables share status/adminNotes/updatedAt. */
function tableFor(type: LeadType) {
  switch (type) {
    case "carfax":
      return schema.carfaxRequests;
    case "inquiry":
      return schema.inquiries;
    case "calculator":
      return schema.calculatorOffers;
  }
}

export type UpdateLeadInput = {
  type: LeadType;
  id: number;
  /** New status; omit to leave unchanged. */
  status?: string;
  /** New free-text notes; omit to leave unchanged. `""` clears the notes. */
  notes?: string;
};

/**
 * Admin-only: update a lead's `status` and/or `admin_notes` (and bump
 * `updated_at`). Parameterised over the three lead tables. Returns an
 * `ActionResult` — a non-admin caller gets `{ success:false }` rather than a
 * redirect (an action can't redirect mid-flow); the proxy + page already block
 * non-admins from ever reaching a screen that calls this.
 *
 * Persist-first is trivial here (there's no email side-effect). On success it
 * revalidates the /admin tree so the inbox + dashboard counts reflect the change.
 */
export async function updateLead(input: UpdateLeadInput): Promise<ActionResult> {
  if (!(await getAdminSession())) {
    return { success: false, error: "Нямате достъп до тази операция." };
  }

  if (!isLeadType(input?.type)) {
    return { success: false, error: "Невалиден тип заявка." };
  }
  if (!Number.isInteger(input.id) || input.id <= 0) {
    return { success: false, error: "Невалиден идентификатор." };
  }

  const patch: { status?: string; adminNotes?: string | null; updatedAt: Date } = {
    updatedAt: new Date(),
  };

  if (input.status !== undefined) {
    if (!isLeadStatus(input.status)) {
      return { success: false, error: "Невалиден статус." };
    }
    patch.status = input.status;
  }
  if (input.notes !== undefined) {
    const trimmed = input.notes.trim();
    patch.adminNotes = trimmed.length ? trimmed : null;
  }

  // Nothing to change beyond the timestamp → treat as a no-op success.
  if (patch.status === undefined && patch.adminNotes === undefined) {
    return { success: true, data: undefined };
  }

  const t = tableFor(input.type);
  try {
    const rows = await getDb().update(t).set(patch).where(eq(t.id, input.id)).returning({ id: t.id });
    if (rows.length === 0) {
      return { success: false, error: "Заявката не е намерена." };
    }
  } catch (error) {
    console.error("[update-lead] update failed", error);
    return { success: false, error: "Възникна грешка при запазването. Моля опитайте отново." };
  }

  revalidatePath("/admin", "layout");
  return { success: true, data: undefined };
}
