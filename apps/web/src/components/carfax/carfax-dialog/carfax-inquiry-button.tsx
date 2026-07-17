"use client";

import { useState } from "react";
import { Button } from "@/components/common";
import { CarfaxDialog } from "./carfax-dialog";

/**
 * A button that opens the in-page {@link CarfaxDialog} — the Carfax inquiry form
 * pre-filled (and locked) with the car's VIN/make/model, so the visitor stays on
 * the page. Bundles its own open state (only two trigger sites — the car-detail
 * contact panel and the VIN-check tool — so a self-contained button beats a
 * site-wide context). Style the trigger via `className`, matching the surrounding
 * buttons; `children` is its label.
 */
export function CarfaxInquiryButton({
  vin,
  make,
  model,
  lotNumber,
  className,
  rippleTheme,
  children,
}: {
  vin?: string;
  make?: string;
  model?: string;
  lotNumber?: string;
  className?: string;
  rippleTheme?: "dark" | "light";
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button onClick={() => setOpen(true)} className={className} rippleTheme={rippleTheme}>
        {children}
      </Button>
      <CarfaxDialog
        isOpen={open}
        onClose={() => setOpen(false)}
        vin={vin}
        make={make}
        model={model}
        lotNumber={lotNumber}
      />
    </>
  );
}
