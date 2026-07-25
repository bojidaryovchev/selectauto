import { z } from "zod";
import { RECIPIENT_KINDS } from "@/constants/contracts";

/**
 * Validation for the "Получатели" settings form (/admin/poluchateli — spec §8):
 * the company/bank details a payment notice is addressed to. Only the name and
 * kind are mandatory to SAVE a recipient — but notice GENERATION separately
 * blocks while the bank fields required on the document (bank, IBAN, SWIFT) are
 * empty, so a half-filled partner can be drafted without breaking anything.
 * Shared by the client form and the save mutation.
 */
export const recipientSchema = z.object({
  kind: z.enum(RECIPIENT_KINDS),
  name: z.string().trim().min(1, { message: "Моля въведете наименование." }).max(200),
  country: z.string().trim().max(100).optional(),
  address: z.string().trim().max(300).optional(),
  vatNumber: z.string().trim().max(50).optional(),
  bankName: z.string().trim().max(200).optional(),
  bankAddress: z.string().trim().max(300).optional(),
  iban: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z0-9 ]*$/, { message: "IBAN/сметката може да съдържа само букви и цифри." })
    .max(50)
    .optional(),
  swiftBic: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z0-9]*$/, { message: "SWIFT/BIC може да съдържа само букви и цифри." })
    .max(20)
    .optional(),
  currency: z.string().trim().toUpperCase().max(10).optional(),
  chargesInstruction: z.string().trim().max(200).optional(),
  paymentMethod: z.string().trim().max(100).optional(),
  active: z.boolean(),
});

export type RecipientFormValues = z.infer<typeof recipientSchema>;
