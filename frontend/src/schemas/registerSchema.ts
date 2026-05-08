import { z } from "zod";

const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters long.")
  .regex(/[A-Z]/, "Must contain one uppercase letter.") // The message is added to 'ZodError' object, thrown when the data doesn't match the schema
  .regex(/\d/, "Must contain one number.")
  .regex(/[!@#$%^&*(),.?":{}|<>]/, "Must contain one special character."); // Matches anything that is not a letter or a number

export const registerSchema = z
  .object({
    name: z
      .string()
      .min(1, "A username is required.")
      .max(30)
      .regex(/^[^<>]*$/, "Name cannot contain < or > characters."), // Blocks script tags (XSS attacks)
    email: z
      .string()
      .trim()
      .min(1, "Email is required.")
      .pipe(z.email({ message: "Invalid email address." })),
    password: passwordSchema,
    confirmPassword: passwordSchema,
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  });

export type RegisterInput = z.infer<typeof registerSchema>;
