"use client";

import { useSearchParams } from "next/navigation";
import type { CarfaxFormValues } from "@/schemas/carfax.schema";
import { CarfaxForm } from "./carfax-form";

/**
 * The Carfax form seeded from the URL: car-detail pages deep-link here as
 * `/carfax?vin=…&make=…&model=…` (the „Заяви Carfax проверка" button), so the
 * VIN/make/model land pre-filled — one link's worth of work saved for the user.
 *
 * A separate client wrapper (not searchParams in the page) keeps the /carfax page
 * a static shell under Cache Components: `useSearchParams()` makes only this
 * subtree dynamic, behind the section's <Suspense> boundary whose fallback is the
 * plain (empty) form. Mirrors `CostEstimatorFromUrl` on /kalkulator.
 */
export function CarfaxFormFromUrl() {
  const sp = useSearchParams();
  const defaults: Partial<CarfaxFormValues> = {};
  const vin = sp.get("vin");
  const make = sp.get("make");
  const model = sp.get("model");
  // VIN is upper-cased to match the form's own normalization (and the schema check).
  if (vin) defaults.vin = vin.trim().toUpperCase();
  if (make) defaults.car_make = make;
  if (model) defaults.car_model = model;

  return <CarfaxForm defaults={defaults} />;
}
