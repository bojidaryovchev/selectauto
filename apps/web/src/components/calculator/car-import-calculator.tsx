"use client";

import { useState } from "react";
import { Button } from "@/components/common";
import type { MarketId, VehicleType } from "@/data/import-rates";
import { CalculatorDialog } from "./calculator-dialog";

/**
 * Per-listing import-calculator trigger (owner request: a per-car „Калкулирай
 * вноса" CTA so the buyer sees the landed cost without leaving the page). Renders
 * a single button that opens the full-screen-on-mobile {@link CalculatorDialog},
 * pre-seeded with THIS car's price + market + vehicle-type size class. Bundles its
 * own open state (a self-contained trigger, mirroring `CarfaxInquiryButton`).
 */
export function CarImportCalculator({
  defaultPrice,
  defaultMarket,
  defaultVehicleType,
  carLabel,
  lotNumber,
}: {
  defaultPrice: number;
  defaultMarket?: MarketId;
  defaultVehicleType?: VehicleType;
  carLabel?: string;
  lotNumber?: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        onClick={() => setOpen(true)}
        rippleTheme="dark"
        className="inline-flex min-h-12 w-full items-center justify-center rounded-full border border-line bg-white px-5 text-sm font-extrabold uppercase tracking-wide text-[#333] transition-transform duration-200 hover:-translate-y-0.5 hover:text-brand-dark"
      >
        Калкулирай вноса до България
      </Button>
      <CalculatorDialog
        isOpen={open}
        onClose={() => setOpen(false)}
        defaultPrice={defaultPrice}
        defaultMarket={defaultMarket}
        defaultVehicleType={defaultVehicleType}
        carLabel={carLabel}
        lotNumber={lotNumber}
      />
    </>
  );
}
