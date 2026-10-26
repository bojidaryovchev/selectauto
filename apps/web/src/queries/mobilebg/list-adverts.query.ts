import { ADMIN_PAGE_SIZE } from "@/constants/admin";
import { getSessionWith } from "@/lib/admin";
import { getDb, schema } from "@/lib/db";
import { and, count, desc, eq, isNotNull, ne, sql, type SQL } from "drizzle-orm";

/**
 * The published-adverts desk: every car ever submitted to mobile.bg, newest
 * activity first, with enough of the car to recognise it.
 *
 * Includes `failed` and `deleted` rows on purpose. A failed publish is the row
 * an admin most needs to see (it carries `last_error`), and a deleted one is the
 * record that we did once pay for that advert.
 *
 * Each row also says whether the car is still offered on the site: dealer
 * adverts never expire and are billed every week, and nothing took one down
 * when its auction ended — 41 of 115 live adverts were for such cars (measured
 * 26.10.2026). `ended` lists only those.
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
  /** On the site now (`listed`), auction over (`ended`), or not shown at all (`gone`: hidden, or no listing). */
  listing: "listed" | "ended" | "gone";
};

export async function listMobilebgAdverts(
  page = 1,
  filter: "all" | "ended" = "all",
): Promise<{ rows: MobilebgAdvertRow[]; total: number; endedLive: number }> {
  if (!(await getSessionWith("mobilebg.publish"))) throw new Error("FORBIDDEN");

  const db = getDb();
  const a = schema.mobilebgAdverts;
  const safePage = Number.isInteger(page) && page > 0 ? page : 1;

  const listing = sql<MobilebgAdvertRow["listing"]>`CASE
    WHEN EXISTS (SELECT 1 FROM car_listings cl WHERE cl.car_id = ${a.carId}) THEN 'listed'
    WHEN EXISTS (SELECT 1 FROM car_listings_archived x WHERE x.car_id = ${a.carId}) THEN 'ended'
    ELSE 'gone' END`;
  // Live at mobile.bg (an id, not deleted) and no longer offered here.
  const endedLive: SQL = and(
    isNotNull(a.ida),
    ne(a.status, "deleted"),
    sql`NOT EXISTS (SELECT 1 FROM car_listings cl WHERE cl.car_id = ${a.carId})`,
  )!;
  const where = filter === "ended" ? endedLive : undefined;

  const [rows, [totalRow], [endedRow]] = await Promise.all([
    db
      .select({
        carId: a.carId,
        ida: a.ida,
        status: a.status,
        priceEur: a.priceEur,
        pictureCount: a.pictureCount,
        publishedAt: a.publishedAt,
        updatedAt: a.updatedAt,
        lastError: a.lastError,
        title: schema.cars.title,
        year: schema.cars.year,
        vin: schema.cars.vin,
        listing,
      })
      .from(a)
      .leftJoin(schema.cars, eq(schema.cars.id, a.carId))
      .where(where)
      .orderBy(desc(a.updatedAt))
      .limit(ADMIN_PAGE_SIZE)
      .offset((safePage - 1) * ADMIN_PAGE_SIZE),
    db.select({ n: count() }).from(a).where(where),
    db.select({ n: count() }).from(a).where(endedLive),
  ]);

  return { rows, total: totalRow?.n ?? 0, endedLive: endedRow?.n ?? 0 };
}
