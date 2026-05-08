import * as z from "zod";

export const twoFactorCodeSchema = z.object({
  code: z.string().regex(/^\d{6}$/, "Code must be 6 digits"),
});

export const twoFactorVerifyLoginSchema = z.object({
  userId: z.string(),
  code: z
    .string()
    .trim()
    .min(1, "Code is required")
    .refine((value) => /^\d{6}$/.test(value) || /^[A-F0-9]{4}-[A-F0-9]{4}$/.test(value), {
      message: "Enter a valid 6-digit code or recovery code",
    }),
});

export const otpOrRecoveryCodeSchema = z.object({
  code: z
    .string()
    .trim()
    .min(1, "Code is required")
    .refine((value) => /^\d{6}$/.test(value) || /^[A-F0-9]{4}-[A-F0-9]{4}$/.test(value), {
      message: "Enter a valid 6-digit code or recovery code",
    }),
});
