import { z } from "zod";
import { CLIENT_KINDS } from "@/constants/contracts";

/**
 * Validation for a contract client (физическо/юридическо лице — spec §3.2),
 * used inside the contract-creation wizard and re-validated by the server
 * action. Per-kind requirements: an individual needs three names + ЕГН; a
 * company needs a company name + ЕИК. The rest (address, phone, email…) is
 * optional — the paper contracts don't always carry it.
 */
export const clientSchema = z
  .object({
    kind: z.enum(CLIENT_KINDS),
    name: z.string().trim().min(1, { message: "Моля въведете име / фирма." }).max(300),
    egn: z
      .string()
      .trim()
      .regex(/^\d{10}$/, { message: "ЕГН трябва да е точно 10 цифри." })
      .optional()
      .or(z.literal("")),
    eik: z
      .string()
      .trim()
      .regex(/^\d{9}(\d{4})?$/, { message: "ЕИК трябва да е 9 или 13 цифри." })
      .optional()
      .or(z.literal("")),
    vatNumber: z.string().trim().max(50).optional(),
    address: z.string().trim().max(300).optional(),
    representative: z.string().trim().max(200).optional(),
    phone: z.string().trim().max(50).optional(),
    email: z.union([z.string().trim().email({ message: "Невалиден имейл." }), z.literal("")]).optional(),
  })
  .superRefine((values, ctx) => {
    if (values.kind === "individual" && !values.egn) {
      ctx.addIssue({ code: "custom", path: ["egn"], message: "Моля въведете ЕГН." });
    }
    if (values.kind === "company" && !values.eik) {
      ctx.addIssue({ code: "custom", path: ["eik"], message: "Моля въведете ЕИК." });
    }
  });

export type ClientFormValues = z.infer<typeof clientSchema>;
