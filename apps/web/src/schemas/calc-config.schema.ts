import { z } from "zod";

/**
 * Validation for the admin-editable calculator config (/admin/tarifi settings
 * form → updateCalcConfig). Mirrors `CalcConfig` in data/import-rates.ts. Bounds
 * are generous sanity limits (reject junk, never block a real value).
 */

const money = z.number({ message: "Невалидна стойност." }).min(0, { message: "Не може да е отрицателна." }).max(1_000_000);
const pct = z.number({ message: "Невалиден процент." }).min(0).max(100);
const fraction = z.number({ message: "Невалидна стойност." }).min(0).max(1);

export const calcConfigSchema = z.object({
  eurUsd: z.number({ message: "Невалиден курс." }).min(0.1).max(10),
  dutyPct: pct,
  vatPct: pct,
  krTransportEur: z.object({ sedan: money, suv: money }),
  commissionTiers: z
    .array(z.object({ maxPriceEur: money, commissionEur: money }))
    .min(1, { message: "Нужен е поне един праг за комисионната." }),
  commissionCapEur: money,
  usAuctionFlatUsd: money,
  usAuctionThresholdUsd: money,
  usAuctionPct: z.object({ copart: fraction, iaai: fraction }),
  usFixedFeesUsd: z.object({
    title: money,
    environmental: money,
    reinvoicing: money,
    onlineBid: money,
  }),
  caTransportUsd: money,
  agencyEur: money,
  bgTransportEur: z.object({ sedan: money, suv: money }),
  technotestEur: money,
});

export type CalcConfigValues = z.infer<typeof calcConfigSchema>;
