import { z } from "zod";
import { CONTRACT_MARKETS, CONTRACT_STATUSES } from "@/constants/contracts";
import { parseAmountToCents } from "@/lib/money";
import { clientSchema } from "./client.schema";

/**
 * Validation for the mediation-contract forms (/admin/dogovori/nov and the
 * detail-page edit — spec §3). Shared by the client wizard and the server
 * actions. Amounts arrive as human-entered strings ("15 480,50") and are
 * validated against the money parser; the mutations convert them to NUMERIC
 * strings for the DB. The five points may be zero (e.g. Мито и ДДС ориентировъчно
 * попълнено по-късно) — they are editable until the stage is paid.
 */

/** A non-negative money amount with up to 2 decimals; empty = 0. */
const amountField = z
  .string()
  .trim()
  .refine((v) => v === "" || parseAmountToCents(v) !== null, { message: "Невалидна сума." });

/** ISO date from a <input type="date"> ("2026-07-24"); empty = today (server default). */
const dateField = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, { message: "Невалидна дата." })
  .optional()
  .or(z.literal(""));

const carFields = {
  carYear: z.coerce
    .number()
    .int({ message: "Невалидна година." })
    .min(1950, { message: "Невалидна година." })
    .max(2100, { message: "Невалидна година." }),
  carMake: z.string().trim().min(1, { message: "Моля въведете марка." }).max(100),
  carModel: z.string().trim().min(1, { message: "Моля въведете модел." }).max(100),
  vin: z.string().trim().toUpperCase().max(17).optional(),
  purchaseMarket: z.string().trim().max(100).optional(),
  auctionPlatform: z.string().trim().max(100).optional(),
};

const amountFields = {
  amountCar: amountField,
  amountTransport: amountField,
  amountCustomsVat: amountField,
  amountTransportEuBg: amountField,
  amountCommission: amountField,
  /**
   * Канада: перо 1 is entered in CAD together with the rate, and `amountCar`
   * is DERIVED (CAD × rate, rounded to the whole euro) rather than typed. Both
   * are ignored for the other markets.
   */
  amountCarForeign: amountField.optional(),
  foreignRate: z
    .string()
    .trim()
    .optional()
    .refine((v) => !v || (Number(v.replace(",", ".")) > 0 && Number(v.replace(",", ".")) < 1000), {
      message: "Невалиден курс.",
    }),
};

export const createContractSchema = z
  .object({
    market: z.enum(CONTRACT_MARKETS),
    contractDate: dateField,
    /** Existing client id — or newClient below, exactly one of the two. */
    clientId: z.number().int().positive().optional(),
    newClient: clientSchema.optional(),
    ...carFields,
    ...amountFields,
    paymentBasis: z.string().trim().max(200).optional(),
    /** A paid deposit of this client to deduct from payment 1 (§14). */
    depositContractId: z.number().int().positive().optional(),
  })
  .superRefine((values, ctx) => {
    if (!values.clientId && !values.newClient) {
      ctx.addIssue({ code: "custom", path: ["clientId"], message: "Изберете клиент или въведете нов." });
    }
    if (values.clientId && values.newClient) {
      ctx.addIssue({ code: "custom", path: ["clientId"], message: "Изберете само едно: съществуващ или нов клиент." });
    }
    // Канада: both the CAD amount and the rate are required — the EUR перо 1 is
    // computed from them.
    if (values.market === "ca") {
      if (!values.amountCarForeign?.trim()) {
        ctx.addIssue({ code: "custom", path: ["amountCarForeign"], message: "Въведете сумата в канадски долари." });
      }
      if (!values.foreignRate?.trim()) {
        ctx.addIssue({ code: "custom", path: ["foreignRate"], message: "Въведете курс CAD/EUR." });
      }
    }
  });

export type CreateContractValues = z.infer<typeof createContractSchema>;

/**
 * Detail-page edit: car data, dates, amounts, основание and lifecycle status.
 * The client and the applied deposit are frozen at creation (change of client =
 * a new contract); generated documents are never touched by an edit (§2).
 */
export const updateContractSchema = z.object({
  contractDate: dateField,
  ...carFields,
  ...amountFields,
  paymentBasis: z.string().trim().max(200).optional(),
  status: z.enum(CONTRACT_STATUSES),
});

export type UpdateContractValues = z.infer<typeof updateContractSchema>;
