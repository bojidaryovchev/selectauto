"use server";

import { getSessionWith } from "@/lib/admin";
import { prepareNotice, type PaymentNoticeInput } from "@/lib/prepare-notice";
import type { ActionResult } from "@/types/action-result.type";
import type { NoticeSnapshot } from "@/types/notice-snapshot.type";

/**
 * The §6.3 preview: runs exactly the validation and snapshot builder the
 * generation runs, without writing anything, so the preview shows the lines and
 * the total the PDF will print. The old client-side preview recomputed the sum
 * on its own and hid two errors that reached clients — a 0.00 евро total and a
 * deposit taken off twice.
 *
 * `.action.ts`, not `.mutation.ts`: the repo reserves that suffix for writes.
 * Still gated like the generation: a server action is a public POST endpoint.
 */
export async function previewPaymentNotice(input: PaymentNoticeInput): Promise<ActionResult<NoticeSnapshot>> {
  if (!(await getSessionWith("notices.generate"))) return { success: false, error: "Нямате достъп до тази операция." };
  try {
    const prepared = await prepareNotice(input);
    if (!prepared.ok) return { success: false, error: prepared.error };
    return { success: true, data: prepared.notice.snapshot };
  } catch (error) {
    console.error("[preview-payment-notice] failed", error);
    return { success: false, error: "Прегледът не можа да се състави. Моля опитайте отново." };
  }
}
