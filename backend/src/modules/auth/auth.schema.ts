import * as z from "zod";

export const passwordSchema = z
  .string()
  .min(8)
  .regex(/[A-Z]/, "Must contain one uppercase letter") // The message is added to 'ZodError' object, thrown when the data doesn't match the schema
  .regex(/\d/, "Must contain one number")
  .regex(/[!@#$%^&*(),.?":{}|<>]/, "Must contain one special character"); // Matches anything that is not a letter or a number

const nameSchema = z
  .string()
  .min(1)
  .max(30)
  .regex(/^[^<>]*$/, "Name cannot contain < or > characters"); // Blocks script tags (XSS attacks)

const emailField = z.email();

export const registrationInputSchema = z.object({
  email: emailField,
  password: passwordSchema,
  name: nameSchema,
});

export type registrationInput = z.infer<typeof registrationInputSchema>;

export const loginInputSchema = z.object({
  email: emailField,
  password: z.string().min(1, "Password is required"),
});

export type loginInput = z.infer<typeof loginInputSchema>;

export const emailSchema = z.object({
  email: emailField,
});

export type emailInput = z.infer<typeof emailSchema>;

export const resendVerificationSchema = emailSchema;

export type resendVerificationInput = z.infer<typeof resendVerificationSchema>;

export const GoogleTokenResponseSchema = z.object({
  id_token: z.string().min(1),
});

export type GoogleTokenResponse = z.infer<typeof GoogleTokenResponseSchema>;

export const verifyEmailSchema = z.object({
  token: z.string().min(1, "Token is required"),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1, "Token is required"),
  newPassword: passwordSchema,
  twoFactorCode: z
    .string()
    .regex(/^\d{6}$/, "Code must be 6 digits")
    .optional(),
});
