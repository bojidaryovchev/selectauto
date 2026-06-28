import { z } from "zod";

/**
 * Shared validation schema for the "Безплатна консултация" inquiry, used by both
 * the client modal and the `createInquiry` server action. Mirrors the original
 * theme.js quiz: name and phone are required; the quiz answers (specific model,
 * brand, model, budget, time, finance) are all optional. The phone is validated
 * in its normalised `+359…` form — the client runs `normalizePhone` before
 * submitting, and the action does the same defensively, so both validate the
 * same final value.
 */
export const inquirySchema = z.object({
  name: z.string().trim().min(1, { message: "Моля въведете име." }),
  phone: z
    .string()
    .trim()
    // Same check as theme.js `isValidPhone` (and the modal): a full BG mobile.
    .regex(/^\+359[7-9]\d{8}$/, {
      message: "Моля въведете име и валиден телефонен номер.",
    }),
  specific_model: z.string().optional(),
  brand: z.string().optional(),
  model: z.string().optional(),
  budget: z.string().optional(),
  time: z.string().optional(),
  finance: z.string().optional(),
  page_url: z.string().optional(),
});

export type InquiryFormValues = z.infer<typeof inquirySchema>;
