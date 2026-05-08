import { z } from "zod";
import ms, { type StringValue } from "ms";

const envSchema = z
  .object({
    NODE_ENV: z.enum(["development", "production"]),
    DATABASE_URL: z.url(),
    JWT_SECRET: z.string().min(32),
    COOKIE_SECRET: z.string().min(32),
    JWT_EXPIRATION: z
      .string()
      .refine((val): val is StringValue => typeof ms(val as StringValue) === "number", {
        message: "JWT_EXPIRATION must be a valid duration like 15m, 1h, or 1d",
      }),
    FRONTEND_URL: z.url(),

    EMAIL_PROVIDER: z.enum(["mailpit", "resend"]),

    SMTP_HOST: z.string().optional(),
    SMTP_PORT: z.coerce.number().optional(),
    SMTP_SECURE: z
      .enum(["true", "false"])
      .transform((value) => value === "true")
      .optional(),
    SMTP_FROM: z.string().optional(),

    RESEND_API_KEY: z.string().optional(),
    EMAIL_FROM: z.string().optional(),

    LOGSTASH_URL: z.url(),

    TWO_FACTOR_ENCRYPTION_KEY: z.string().refine(
      (val) => {
        try {
          return Buffer.from(val, "base64").length === 32;
        } catch {
          return false;
        }
      },
      {
        message: "TWO_FACTOR_ENCRYPTION_KEY must be a base64 string that decodes to 32 bytes",
      },
    ),
    GOOGLE_CLIENT_ID: z.string().min(1),
    GOOGLE_CLIENT_SECRET: z.string().min(1),
    GOOGLE_REDIRECT_URI: z.url(),
  })
  .superRefine((env, ctx) => {
    if (env.EMAIL_PROVIDER === "mailpit") {
      if (!env.SMTP_HOST) {
        ctx.addIssue({
          code: "custom",
          path: ["SMTP_HOST"],
          message: "SMTP_HOST is required when EMAIL_PROVIDER=mailpit",
        });
      }

      if (env.SMTP_PORT === undefined) {
        ctx.addIssue({
          code: "custom",
          path: ["SMTP_PORT"],
          message: "SMTP_PORT is required when EMAIL_PROVIDER=mailpit",
        });
      }

      if (env.SMTP_SECURE === undefined) {
        ctx.addIssue({
          code: "custom",
          path: ["SMTP_SECURE"],
          message: "SMTP_SECURE is required when EMAIL_PROVIDER=mailpit",
        });
      }

      if (!env.SMTP_FROM) {
        ctx.addIssue({
          code: "custom",
          path: ["SMTP_FROM"],
          message: "SMTP_FROM is required when EMAIL_PROVIDER=mailpit",
        });
      }
    }

    if (env.EMAIL_PROVIDER === "resend") {
      if (!env.RESEND_API_KEY) {
        ctx.addIssue({
          code: "custom",
          path: ["RESEND_API_KEY"],
          message: "RESEND_API_KEY is required when EMAIL_PROVIDER=resend",
        });
      }

      if (!env.EMAIL_FROM) {
        ctx.addIssue({
          code: "custom",
          path: ["EMAIL_FROM"],
          message: "EMAIL_FROM is required when EMAIL_PROVIDER=resend",
        });
      }
    }
  });

const env = envSchema.parse(process.env);
// Zod throws an error if the environment variables do not match the schema.
// Because 'env' is imported in server.ts, the check happens during the module loading phase (importation of the file). If the validation fails, the process crashes before the Fastify server even attempts to start.
// It prevents the server from starting with invalid configuration.

export { env };
