import * as z from "zod";

const passSchema = z
  .string()
  .min(8, "Password must be at least 8 characters long.")
  .regex(/[A-Z]/, "Must contain one uppercase letter.")
  .regex(/\d/, "Must contain one number.")
  .regex(/[!@#$%^&*(),.?":{}|<>]/, "Must contain one special character.");

export const passwordSchema = z
  .object({
    newPassword: passSchema,
    confirmPassword: passSchema,
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  });
