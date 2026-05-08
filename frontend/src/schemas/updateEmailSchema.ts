import * as z from "zod";

export const updateEmailSchema = z.object({
  newEmail: z
    .string()
    .trim()
    .min(1, "Email is required.")
    .pipe(z.email({ message: "Invalid email address." })),
  currentPassword: z.string().min(1, "Current password is required."),
  twoFactorCode: z
    .string()
    .regex(/^\d{6}$/, "Code must be 6 digits.")
    .optional(),
});
