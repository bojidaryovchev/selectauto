"use client";

import { useState } from "react";
import { Button } from "@/components/common";
import type { MarketId, VehicleType } from "@/data/import-rates";
import { CostEstimator } from "./cost-estimator";

/**
 * Per-listing collapsible import calculator (owner request: an inline dropdown on
 * each car ad so the buyer sees the landed cost without leaving the page). Starts
 * collapsed as a single button; expands to the full <CostEstimator> pre-seeded
 * with THIS car's price + market + vehicle type. Still a general tool once open —
 * the buyer can tweak every input.
 */
export function CarImportCalculator({
  defaultPrice,
  defaultMarket,
  defaultVehicleType,
}: {
  defaultPrice: number;
  defaultMarket?: MarketId;
  defaultVehicleType?: VehicleType;
}) {
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <Button
        onClick={() => setOpen(true)}
        rippleTheme="dark"
        className="inline-flex min-h-12 w-full items-center justify-center rounded-full border border-line bg-white px-5 text-sm font-extrabold uppercase tracking-wide text-[#333] transition-transform duration-200 hover:-translate-y-0.5 hover:text-brand-dark"
      >
        Калкулирай вноса до България
      </Button>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-4">
        <span className="text-sm font-extrabold uppercase tracking-wide text-ink">Калкулатор за внос</span>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-xs font-bold text-muted underline-offset-2 hover:text-ink hover:underline"
        >
          Скрий
        </button>
      </div>
      <CostEstimator
        defaultPrice={defaultPrice}
        defaultMarket={defaultMarket}
        defaultVehicleType={defaultVehicleType}
      />
    </div>
  );
}
