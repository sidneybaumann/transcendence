import * as z from "zod";

export const otpOrRecoveryCodeSchema = z.object({
  code: z
    .string()
    .trim()
    .min(1, "Please enter your authentication code or recovery code.")
    .refine(
      (value) => /^\d{6}$/.test(value) || /^[A-F0-9]{4}-[A-F0-9]{4}$/.test(value),
      {
        message: "Enter a valid 6-digit code or recovery code.",
      },
    ),
});