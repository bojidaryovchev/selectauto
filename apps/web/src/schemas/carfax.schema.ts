import { z } from "zod";

/**
 * Shared validation schema for the Carfax inquiry, used by both the client form
 * and the API route handler. Mirrors the original form's required fields:
 * name, phone and VIN are mandatory; email, make, model and message are
 * optional. Each required field carries its OWN short message (rather than the
 * original single "Моля попълнете име, телефон и VIN номер." repeated on all
 * three) so inline field errors read as three distinct hints instead of the
 * same line stacked under every field.
 */
export const carfaxSchema = z.object({
  full_name: z
    .string()
    .trim()
    .min(1, { message: "Въведи име и фамилия." }),
  phone: z
    .string()
    .trim()
    .min(1, { message: "Въведи телефон за връзка." }),
  // The original handler ran the email through sanitize_email and never
  // rejected the submission on a bad address, so this stays optional and lenient.
  email: z.string().optional(),
  vin: z
    .string()
    .trim()
    .min(1, { message: "Въведи VIN номер." })
    // Same format check as the original PHP handler: 11–17 chars, no I/O/Q.
    .refine((value) => /^[A-HJ-NPR-Z0-9]{11,17}$/.test(value.toUpperCase()), {
      message: "Невалиден VIN номер — провери за печатна грешка.",
    }),
  car_make: z.string().optional(),
  car_model: z.string().optional(),
  message: z.string().optional(),
  page_url: z.string().optional(),
});

export type CarfaxFormValues = z.infer<typeof carfaxSchema>;
