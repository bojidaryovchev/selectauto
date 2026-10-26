import { US_CONTAINER_PRICES, US_INLAND_TARIFFS } from "@/data/us-transport-tariffs";
import { getAdminSession } from "@/lib/admin";
import { getDb, schema } from "@/lib/db";
import type { UsTariffData } from "@/lib/us-transport";
import { eq } from "drizzle-orm";
import { readTariffUpload } from "./read-tariff-upload";

export type TariffBaseline =
  | { source: "upload"; uploadId: number; createdAt: Date; data: UsTariffData }
  | { source: "builtin"; data: UsTariffData };

/**
 * Admin-only: the table US transport is priced from right now — the active
 * upload's rows, else the built-in table — without the owner-quoted yards
 * (`getUsTariffs` appends those to every dataset, so a paste never changes them).
 * A new paste is compared with this before it goes live. Uncached, like the
 * check it serves; the same fallbacks as `getUsTariffs`.
 */
export async function getTariffBaseline(): Promise<TariffBaseline> {
  if (!(await getAdminSession())) throw new Error("FORBIDDEN");

  const [active] = await getDb()
    .select({ id: schema.tariffUploads.id, createdAt: schema.tariffUploads.createdAt })
    .from(schema.tariffUploads)
    .where(eq(schema.tariffUploads.active, true))
    .limit(1);
  const uploaded = active ? await readTariffUpload(active.id) : null;
  if (!active || !uploaded) {
    return { source: "builtin", data: { inland: US_INLAND_TARIFFS, container: US_CONTAINER_PRICES } };
  }
  return { source: "upload", uploadId: active.id, createdAt: active.createdAt, data: uploaded };
}
