import * as z from "zod";

export const passwordSchema = z
  .string()
  .min(8)
  .regex(/[A-Z]/, "Must contain one uppercase letter") // The message is added to 'ZodError' object, thrown when the data doesn't match the schema
  .regex(/\d/, "Must contain one number")
  .regex(/[!@#$%^&*(),.?":{}|<>]/, "Must contain one special character"); // Matches anything that is not a letter or a number

const nameSchema = z
  .string()
  .min(1, "A username is required")
  .max(30)
  .regex(/^[^<>]*$/, "Name cannot contain < or > characters"); // Blocks script tags (XSS attacks)

const emailField = z
  .string()
  .trim()
  .min(1, "Email is required.")
  .pipe(z.email({ message: "Invalid email address." }));

export const updateNameSchema = z.object({
  newName: nameSchema,
});

export type updateNameInput = z.infer<typeof updateNameSchema>;

export const updateEmailSchema = z.object({
  newEmail: emailField,
  currentPassword: z.string().min(1, "Password is required"),
  twoFactorCode: z
    .string()
    .regex(/^\d{6}$/)
    .optional(),
});

export type updateEmailInput = z.infer<typeof updateEmailSchema>;

export const updatePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: passwordSchema,
    twoFactorCode: z
      .string()
      .regex(/^\d{6}$/, "Code must be 6 digits")
      .optional(),
  })
  .refine((data) => data.currentPassword !== data.newPassword, {
    message: "New password must be different from current password",
    path: ["newPassword"],
  });

export type updatePasswordInput = z.infer<typeof updatePasswordSchema>;

export const exportDataSchema = z.object({
  currentPassword: z.string().optional(),
  twoFactorCode: z
    .string()
    .regex(/^\d{6}$/, "Code must be 6 digits")
    .optional(),
});

export type exportDataInput = z.infer<typeof exportDataSchema>;

export const deleteAccountSchema = z.object({
  currentPassword: z.string().optional(),
  twoFactorCode: z
    .string()
    .regex(/^\d{6}$/, "Code must be 6 digits")
    .optional(),
  confirmation: z.literal("DELETE"),
});

export type deleteAccountInput = z.infer<typeof deleteAccountSchema>;
