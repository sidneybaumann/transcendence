import * as z from "zod";

export const updatePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required."),
    newPassword: z
      .string()
      .min(8, "New password must be at least 8 characters long.")
      .regex(/[A-Z]/, "New password must contain at least one uppercase letter.")
      .regex(/\d/, "New password must contain at least one number.")
      .regex(/[^A-Za-z0-9]/, "New password must contain at least one special character."),
    confirmPassword: z.string().min(1, "Please confirm your new password."),
    twoFactorCode: z
      .string()
      .regex(/^\d{6}$/, "Code must be 6 digits.")
      .optional(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    path: ["confirmPassword"],
    message: "New passwords do not match.",
  });