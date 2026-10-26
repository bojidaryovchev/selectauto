import { z } from "zod";

/**
 * Validation for the admin-editable calculator config (/admin/tarifi settings
 * form → updateCalcConfig). Mirrors `CalcConfig` in data/import-rates.ts. Bounds
 * are generous sanity limits (reject junk, never block a real value). Every
 * message names its field — the form shows only the first one, and the default
 * zod messages were English and didn't say which field was wrong.
 */

const money = (label: string) =>
  z
    .number({ message: `${label}: въведете число.` })
    .min(0, { message: `${label}: не може да е под 0.` })
    .max(1_000_000, { message: `${label}: най-много 1 000 000.` });
const pct = (label: string) =>
  z
    .number({ message: `${label}: въведете число.` })
    .min(0, { message: `${label}: от 0 до 100 %.` })
    .max(100, { message: `${label}: от 0 до 100 %.` });
/** A percentage stored as a fraction (the form edits it as 0–100 %). */
const fraction = (label: string) =>
  z
    .number({ message: `${label}: въведете число.` })
    .min(0, { message: `${label}: от 0 до 100 %.` })
    .max(1, { message: `${label}: от 0 до 100 %.` });

export const calcConfigSchema = z.object({
  eurUsd: z
    .number({ message: "Курс EUR→USD: въведете число." })
    .min(0.1, { message: "Курс EUR→USD: между 0,1 и 10." })
    .max(10, { message: "Курс EUR→USD: между 0,1 и 10." }),
  dutyPct: pct("Мито"),
  vatPct: pct("ДДС"),
  krEncarFeeEur: money("ENCAR такса"),
  krDocsPct: pct("Документи (Корея)"),
  krTransportEur: z.object({ sedan: money("Корея, транспорт — седан"), suv: money("Корея, транспорт — джип") }),
  commissionTiers: z
    .array(z.object({ maxPriceEur: money("Праг на комисионната"), commissionEur: money("Комисионна") }))
    .min(1, { message: "Нужен е поне един праг за комисионната." }),
  commissionCapEur: money("Комисионна над последния праг"),
  usAuctionFlatUsd: money("Фиксирана аукционна такса"),
  usAuctionThresholdUsd: money("Праг на аукционната такса"),
  usAuctionPct: z.object({ copart: fraction("Copart над прага"), iaai: fraction("IAAI над прага") }),
  usFixedFeesUsd: z.object({
    title: money("Title"),
    environmental: money("Environmental"),
    reinvoicing: money("Re-invoicing"),
    onlineBid: money("Онлайн наддаване"),
  }),
  caTransportUsd: money("Канада, транспорт"),
  caTransportBcUsd: z.object({
    sedan: money("Канада (Бр. Колумбия) — седан"),
    suv: money("Канада (Бр. Колумбия) — джип"),
  }),
  agencyEur: money("Митническа агенция"),
  bgTransportEur: z.object({ sedan: money("Автовоз БГ — седан"), suv: money("Автовоз БГ — джип") }),
  technotestEur: money("Технотест"),
  mobilebgMarkupPct: pct("Надценка mobile.bg"),
});

export type CalcConfigValues = z.infer<typeof calcConfigSchema>;
