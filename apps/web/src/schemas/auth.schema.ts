import { z } from "zod";

/**
 * Validation schemas for the self-hosted auth flows (sign-in, sign-up, forgot /
 * reset password). Shared by the client forms (react-hook-form) and the server
 * actions / Credentials `authorize`. Messages are in Bulgarian to match the site.
 */

/** Minimum password policy — 8+ chars. Kept simple but enforced server-side too. */
const password = z
  .string()
  .min(8, { message: "Паролата трябва да е поне 8 символа." })
  .max(72, { message: "Паролата е твърде дълга." }); // bcrypt truncates at 72 bytes

export const signInSchema = z.object({
  email: z.string().trim().email({ message: "Невалиден имейл адрес." }),
  password: z.string().min(1, { message: "Моля въведете парола." }),
});
export type SignInValues = z.infer<typeof signInSchema>;

export const signUpSchema = z
  .object({
    name: z.string().trim().min(1, { message: "Моля въведете име." }).max(120),
    email: z.string().trim().email({ message: "Невалиден имейл адрес." }),
    password,
    confirmPassword: z.string().min(1, { message: "Моля потвърдете паролата." }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Паролите не съвпадат.",
    path: ["confirmPassword"],
  });
export type SignUpValues = z.infer<typeof signUpSchema>;

export const forgotPasswordSchema = z.object({
  email: z.string().trim().email({ message: "Невалиден имейл адрес." }),
});
export type ForgotPasswordValues = z.infer<typeof forgotPasswordSchema>;

export const resetPasswordSchema = z.object({
  token: z.string().min(1),
  password,
});
export type ResetPasswordValues = z.infer<typeof resetPasswordSchema>;
