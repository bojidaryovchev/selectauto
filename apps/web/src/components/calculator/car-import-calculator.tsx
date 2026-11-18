"use client";

import { useCallback, useRef, useState } from "react";
import { Button } from "@/components/common";
import { CalculatorIcon } from "@/components/icons";
import type { MarketId, UsAuction, VehicleType } from "@/data/import-rates";
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
  defaultAuction,
  defaultUsLocation,
  defaultCaFromBc,
  carLabel,
  lotNumber,
}: {
  /** USD pre-seed for the price field; auction lots without a bid have none. */
  defaultPrice?: number;
  defaultMarket?: MarketId;
  defaultVehicleType?: VehicleType;
  /** This lot's auction house (Copart/IAAI) — presets the auction control. */
  defaultAuction?: UsAuction;
  /** This lot's yard zip/city/state — preselects the US location dropdown. */
  defaultUsLocation?: { zip?: string; city?: string; state?: string };
  /** Canada only: the lot is in British Columbia — presets the province control. */
  defaultCaFromBc?: boolean;
  carLabel?: string;
  lotNumber?: string;
}) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  // Closing hands focus back to the button that opened the dialog.
  const close = useCallback(() => {
    setOpen(false);
    triggerRef.current?.focus();
  }, []);

  return (
    <>
      {/* Board `cd-*`: a tonal button under the price panel. */}
      <Button ref={triggerRef} variant="ton" size="md" block onClick={() => setOpen(true)}>
        <CalculatorIcon />
        Калкулирайте вноса до България
      </Button>
      <CalculatorDialog
        isOpen={open}
        onClose={close}
        defaultPrice={defaultPrice}
        defaultMarket={defaultMarket}
        defaultVehicleType={defaultVehicleType}
        defaultAuction={defaultAuction}
        defaultUsLocation={defaultUsLocation}
        defaultCaFromBc={defaultCaFromBc}
        carLabel={carLabel}
        lotNumber={lotNumber}
      />
    </>
  );
}
