import * as z from "zod";

export const deleteAccountSchema = z.object({
  currentPassword: z.string().optional(),
  twoFactorCode: z
    .string()
    .regex(/^\d{6}$/, "Code must be 6 digits.")
    .optional(),
  confirmation: z.string().refine((value) => value === "DELETE", {
    message: 'Please type "DELETE" to confirm.',
  }),
});
