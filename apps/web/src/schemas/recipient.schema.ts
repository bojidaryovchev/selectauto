import { z } from "zod";
import { RECIPIENT_KINDS } from "@/constants/contracts";

/**
 * Validation for the "Получатели" settings form (/admin/poluchateli — spec §8):
 * the company/bank details a payment notice is addressed to. Only the name and
 * kind are mandatory to SAVE a recipient — but notice GENERATION separately
 * blocks while the bank fields required on the document (bank, IBAN, SWIFT) are
 * empty, so a half-filled partner can be drafted without breaking anything.
 * Shared by the client form and the save mutation. Every limit says, in
 * Bulgarian, which field is over it (owner decision 12): zod's default was
 * English („Too big: expected string to have <=10 characters").
 */
export const recipientSchema = z.object({
  kind: z.enum(RECIPIENT_KINDS),
  name: z
    .string()
    .trim()
    .min(1, { message: "Моля въведете наименование." })
    .max(200, { message: "Наименованието може да съдържа най-много 200 знака." }),
  country: z.string().trim().max(100, { message: "Държавата може да съдържа най-много 100 знака." }).optional(),
  address: z.string().trim().max(300, { message: "Адресът може да съдържа най-много 300 знака." }).optional(),
  vatNumber: z.string().trim().max(50, { message: "ДДС/рег. номерът може да съдържа най-много 50 знака." }).optional(),
  bankName: z.string().trim().max(200, { message: "Името на банката може да съдържа най-много 200 знака." }).optional(),
  bankAddress: z
    .string()
    .trim()
    .max(300, { message: "Адресът на банката може да съдържа най-много 300 знака." })
    .optional(),
  // Hyphens too: a non-IBAN account number is written with them (SSANCAR's
  // Shinhan account is 180-008-400167, and without them that row couldn't be
  // saved at all — not even to untick „Активен").
  iban: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z0-9 -]*$/, { message: "IBAN/сметката може да съдържа само букви, цифри, интервали и тирета." })
    .max(50, { message: "IBAN/сметката може да съдържа най-много 50 знака." })
    .optional(),
  swiftBic: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z0-9]*$/, { message: "SWIFT/BIC може да съдържа само букви и цифри." })
    .max(20, { message: "SWIFT/BIC може да съдържа най-много 20 знака." })
    .optional(),
  routingCode: z.string().trim().max(50, { message: "Routing кодът може да съдържа най-много 50 знака." }).optional(),
  currency: z
    .string()
    .trim()
    .toUpperCase()
    .max(10, { message: "Валутата може да съдържа най-много 10 знака." })
    .optional(),
  chargesInstruction: z
    .string()
    .trim()
    .max(200, { message: "Разноските на превода могат да съдържат най-много 200 знака." })
    .optional(),
  paymentMethod: z
    .string()
    .trim()
    .max(100, { message: "Видът на плащането може да съдържа най-много 100 знака." })
    .optional(),
  active: z.boolean(),
});

export type RecipientFormValues = z.infer<typeof recipientSchema>;
