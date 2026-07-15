"use client";

import { useSearchParams } from "next/navigation";
import { isMarketId } from "@/data/import-rates";
import { CostEstimator } from "./cost-estimator";

/**
 * /kalkulator's estimator instance, seeded from the URL: the car-detail pages
 * deep-link here as `/kalkulator?market=us&price=16743` („Калкулирай вноса" —
 * per-listing landed-cost transparency for one link's worth of work). Malformed
 * or absent params fall back to the estimator's own defaults.
 *
 * A separate client wrapper (not searchParams in the page) so the PAGE stays a
 * static shell under Cache Components: `useSearchParams()` makes only this
 * subtree dynamic, behind the page's <Suspense> boundary — the country hubs
 * keep embedding the plain <CostEstimator> with no URL coupling.
 */
export function CostEstimatorFromUrl() {
  const sp = useSearchParams();
  const market = sp.get("market");
  const priceRaw = Number(sp.get("price"));
  const price = Number.isFinite(priceRaw) && priceRaw > 0 ? Math.round(priceRaw) : undefined;

  return (
    <CostEstimator defaultMarket={isMarketId(market) ? market : undefined} defaultPrice={price} />
  );
}
