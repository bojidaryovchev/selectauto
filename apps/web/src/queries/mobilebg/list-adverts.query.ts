import { count, desc, eq } from "drizzle-orm";
import { getAdminSession } from "@/lib/admin";
import { getDb, schema } from "@/lib/db";
import { ADMIN_PAGE_SIZE } from "@/constants/admin";

/**
 * The published-adverts desk: every car ever submitted to mobile.bg, newest
 * activity first, with enough of the car to recognise it.
 *
 * Includes `failed` and `deleted` rows on purpose. A failed publish is the row
 * an admin most needs to see (it carries `last_error`), and a deleted one is the
 * record that we did once pay for that advert.
 */

export type MobilebgAdvertRow = {
  carId: number;
  ida: string | null;
  status: string;
  priceEur: string | null;
  pictureCount: number;
  publishedAt: Date | null;
  updatedAt: Date;
  lastError: string | null;
  title: string | null;
  year: number | null;
  vin: string | null;
};

export async function listMobilebgAdverts(
  page = 1,
): Promise<{ rows: MobilebgAdvertRow[]; total: number }> {
  if (!(await getAdminSession())) throw new Error("FORBIDDEN");

  const db = getDb();
  const safePage = Number.isInteger(page) && page > 0 ? page : 1;

  const rows = await db
    .select({
      carId: schema.mobilebgAdverts.carId,
      ida: schema.mobilebgAdverts.ida,
      status: schema.mobilebgAdverts.status,
      priceEur: schema.mobilebgAdverts.priceEur,
      pictureCount: schema.mobilebgAdverts.pictureCount,
      publishedAt: schema.mobilebgAdverts.publishedAt,
      updatedAt: schema.mobilebgAdverts.updatedAt,
      lastError: schema.mobilebgAdverts.lastError,
      title: schema.cars.title,
      year: schema.cars.year,
      vin: schema.cars.vin,
    })
    .from(schema.mobilebgAdverts)
    .leftJoin(schema.cars, eq(schema.cars.id, schema.mobilebgAdverts.carId))
    .orderBy(desc(schema.mobilebgAdverts.updatedAt))
    .limit(ADMIN_PAGE_SIZE)
    .offset((safePage - 1) * ADMIN_PAGE_SIZE);

  const [totalRow] = await db.select({ n: count() }).from(schema.mobilebgAdverts);

  return { rows, total: totalRow?.n ?? 0 };
}
