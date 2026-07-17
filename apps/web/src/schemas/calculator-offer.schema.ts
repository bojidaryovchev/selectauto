import { z } from "zod";
import { isValidPhone, normalizePhone } from "@/lib/phone";

/**
 * Validation for the /kalkulator gated-offer flow (Calculator v2).
 *
 * `calculatorOfferContactSchema` — the client form (name/phone/email), used with
 * react-hook-form + zodResolver; the phone normalises (`08…` → `+359…`) during
 * validation, mirroring the inquiry/carfax forms.
 *
 * `calculatorOfferSchema` — the full server-action payload: contact + the RAW
 * calculator inputs. The action recomputes the breakdown from these inputs via
 * `computeImportBreakdown` (single source of truth) rather than trusting any
 * client-sent line items or totals.
 */

export const calculatorOfferContactSchema = z.object({
  name: z.string().trim().min(1, { message: "Моля въведете име." }),
  phone: z
    .string()
    .trim()
    .transform((value) => normalizePhone(value))
    .refine(isValidPhone, { message: "Моля въведете валиден телефонен номер." }),
  email: z.string().trim().email({ message: "Моля въведете валиден имейл." }),
});

export type CalculatorOfferContactValues = z.infer<typeof calculatorOfferContactSchema>;

/** Sane USD bounds for estimate inputs — rejects junk, never blocks real cars.
 *  BG messages: these surface verbatim in the form's error box on failure. */
const usdAmount = z
  .number({ message: "Моля въведете валидна стойност." })
  .int({ message: "Моля въведете цяло число." })
  .min(0, { message: "Стойността не може да е отрицателна." })
  .max(1_000_000, { message: "Моля въведете реалистична стойност (до 1 000 000 $)." });

export const calculatorOfferSchema = z.object({
  name: z.string().trim().min(1, { message: "Моля въведете име." }),
  phone: z
    .string()
    .trim()
    .regex(/^\+359[7-9]\d{8}$/, { message: "Моля въведете валиден телефонен номер." }),
  email: z.string().trim().email({ message: "Моля въведете валиден имейл." }),
  inputs: z.object({
    market: z.enum(["kr", "us", "ca"]),
    vehicleType: z.enum(["sedan", "suv"]),
    priceUsd: usdAmount,
    // Optional per-market fields. Duty/VAT base %, defaults to 100 (full value).
    customsBasePct: z
      .number({ message: "Моля въведете валидна стойност." })
      .int({ message: "Моля въведете цяло число." })
      .min(1, { message: "Митническата основа трябва да е между 1 и 100%." })
      .max(100, { message: "Митническата основа трябва да е между 1 и 100%." })
      .default(100),
    technotest: z.boolean().optional(),
    originDeclaration: z.boolean().optional(), // kr
    auction: z.enum(["copart", "iaai"]).optional(), // us/ca
    location: z.string().optional(), // us — server re-resolves transport from this
    usInlandUsd: usdAmount.optional(),
    usContainerUsd: usdAmount.optional(),
  }),
  page_url: z.string().optional(),
});

export type CalculatorOfferValues = z.infer<typeof calculatorOfferSchema>;
