import { z } from "zod";

export const otpCodeSchema = z.object({
  code: z
    .string()
    .length(6, "Code must be exactly 6 digits.")
    .regex(/^\d+$/, "Code must contain only numbers."),
});

export type OTPCodeInput = z.infer<typeof otpCodeSchema>;
