import { z } from "zod";

/**
 * Shared validation schema for the Carfax inquiry, used by both the client form
 * and the API route handler. Mirrors the original form's required fields:
 * name, phone and VIN are mandatory; email, make, model and message are
 * optional. The original surfaced a single "Моля попълнете име, телефон и VIN
 * номер." message when any required field was missing, so the required-field
 * messages match that string.
 */
export const carfaxSchema = z.object({
  full_name: z
    .string()
    .trim()
    .min(1, { message: "Моля попълнете име, телефон и VIN номер." }),
  phone: z
    .string()
    .trim()
    .min(1, { message: "Моля попълнете име, телефон и VIN номер." }),
  // The original handler ran the email through sanitize_email and never
  // rejected the submission on a bad address, so this stays optional and lenient.
  email: z.string().optional(),
  vin: z
    .string()
    .trim()
    .min(1, { message: "Моля попълнете име, телефон и VIN номер." })
    // Same format check as the original PHP handler: 11–17 chars, no I/O/Q.
    .refine((value) => /^[A-HJ-NPR-Z0-9]{11,17}$/.test(value.toUpperCase()), {
      message: "Моля въведете валиден VIN номер.",
    }),
  car_make: z.string().optional(),
  car_model: z.string().optional(),
  message: z.string().optional(),
  page_url: z.string().optional(),
});

export type CarfaxFormValues = z.infer<typeof carfaxSchema>;
