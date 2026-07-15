import { z } from "zod";

/**
 * Shared validation schema for the /proverka-vin VIN record-availability tool.
 * Used by both the client form (react-hook-form + `zodResolver`) and the
 * `/api/vin-check` route handler, so the client-side check and the server-side
 * guard can never drift. Pure (no server-only imports) so it is safe to bundle
 * to the client — the paid lookup stays behind the route, this only validates the
 * VIN shape.
 *
 * VIN format mirrors ISO 3779 / `lib/vin-reports.isValidVin`: exactly 17 chars,
 * A–Z + 0–9, excluding I, O and Q. The value is trimmed and upper-cased before
 * the format check, so `onSubmit` receives a normalised VIN.
 */
export const vinCheckSchema = z.object({
  vin: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-HJ-NPR-Z0-9]{17}$/, {
      message: "Въведи валиден 17-значен VIN номер (без I, O, Q).",
    }),
});

export type VinCheckValues = z.infer<typeof vinCheckSchema>;
