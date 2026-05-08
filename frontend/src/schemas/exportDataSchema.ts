import * as z from "zod";

export const exportDataSchema = z.object({
  currentPassword: z.string().optional(),
  twoFactorCode: z
    .string()
    .regex(/^\d{6}$/, "Code must be 6 digits.")
    .optional(),
});