import { z } from "zod";
import { parseAmountToCents } from "@/lib/money";
import { clientSchema } from "./client.schema";

/**
 * Validation for the deposit-contract form (/admin/depoziti — spec §14). The
 * deposit template (чл. 3) sets a 500 EUR floor, but the amount is left to the
 * operator (validated positive only) — the business occasionally negotiates.
 * Client selection mirrors the mediation-contract wizard: an existing client id
 * or the full new-client block, exactly one of the two.
 */
export const createDepositSchema = z
  .object({
    clientId: z.number().int().positive().optional(),
    newClient: clientSchema.optional(),
    depositDate: z
      .string()
      .trim()
      .regex(/^\d{4}-\d{2}-\d{2}$/, { message: "Невалидна дата." })
      .optional()
      .or(z.literal("")),
    /** Описание на МПС от чл.1 (напр. "ЛЕК АВТОМОБИЛ"). */
    vehicleDescription: z.string().trim().max(300).optional(),
    budgetAmount: z
      .string()
      .trim()
      .refine((v) => v === "" || parseAmountToCents(v) !== null, { message: "Невалиден бюджет." }),
    budgetCurrency: z.enum(["EUR", "USD"]),
    depositAmount: z
      .string()
      .trim()
      .refine((v) => (parseAmountToCents(v) ?? 0) > 0, { message: "Въведете валидна сума на депозита." }),
  })
  .superRefine((values, ctx) => {
    if (!values.clientId && !values.newClient) {
      ctx.addIssue({ code: "custom", path: ["clientId"], message: "Изберете клиент или въведете нов." });
    }
    if (values.clientId && values.newClient) {
      ctx.addIssue({ code: "custom", path: ["clientId"], message: "Изберете само едно: съществуващ или нов клиент." });
    }
  });

export type CreateDepositValues = z.infer<typeof createDepositSchema>;
