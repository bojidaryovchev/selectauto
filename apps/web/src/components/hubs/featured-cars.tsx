import { connection } from "next/server";
import type { MarketId } from "@/data/import-rates";
import { getCarsPage } from "@/queries/cars";
import { CarScrollRail } from "./car-scroll-rail";

/**
 * Server island: up to six active listings from the hub's market, in the hub's rail (boards `im-hub-*`). Render it in
 * its own band, inside <Suspense fallback={<FeaturedCarsLoading … />}>, so the static content around it doesn't wait
 * for the DB read.
 */
export async function FeaturedCars({
  market,
  title,
  allHref,
  emptyText,
}: {
  market: MarketId;
  title: string;
  allHref: string;
  emptyText: string;
}) {
  // Opt this island into request-time (dynamic) rendering. Under `cacheComponents` Next tries to prerender inside the
  // Suspense boundary too, and the Drizzle/Neon read calls `randomBytes` (prepared-statement id) before any
  // request/uncached data is read — which the prerender-random guard rejects and fails the build. Reading
  // `connection()` first marks this subtree dynamic (it already streams behind a skeleton), so the shell stays static
  // and the listings stream.
  await connection();
  const page = await getCarsPage({ market }, null);
  return <CarScrollRail title={title} allHref={allHref} cars={page.cars.slice(0, 6)} emptyText={emptyText} />;
}

/** The rail while the listings stream: the title, both arrows disabled, four card skeletons. */
export function FeaturedCarsLoading({ title, allHref }: { title: string; allHref: string }) {
  return <CarScrollRail title={title} allHref={allHref} cars={null} />;
}
