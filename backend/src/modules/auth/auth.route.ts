import { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import {
  registerUserHandler,
  loginUserHandler,
  logoutUserHandler,
  verifyEmailHandler,
  resendVerificationEmailHandler,
  forgotPasswordHandler,
  resetPasswordHandler,
  googleCallbackHandler,
  googleLoginHandler,
} from "./auth.controller.js";
import {
  loginInputSchema,
  registrationInputSchema,
  resendVerificationSchema,
  emailSchema,
  verifyEmailSchema,
  resetPasswordSchema
} from "./auth.schema.js";
import { z } from "zod";
import { authenticate } from "../../middleware/authenticate.js";
import { sendLog } from "../../lib/logstash.js";

const authRoute: FastifyPluginAsyncZod = async (server) => {
  server.post(
    "/register",
    {
      onRequest: [
        async () => {
          void sendLog({
            dataset: "server",
            level: "info",
            message: "Route visited: POST /register",
          });
        },
      ],
      config: {
        rateLimit: {
          max: 5,
          timeWindow: "1 hour",
        },
      },
      schema: {
        // If the incoming data fails the validation, Fastify automatically sends a 400 Bad Request response with details about the validation errors.
        tags: ["auth"],
        body: registrationInputSchema,
        response: {
          201: z.object({
            // This is the shape of the response body when the request is successful (status code 200). If registerUserHandler accidentally returns the whole object (including the password hash), Fastify will remove everything that is not defined in the following schema. Acts also as documentation for swagger
            id: z.string(),
            name: z.string(),
            email: z.email(),
          }),
          409: z.object({
            // Documents the "Email already exists" error
            message: z.string(),
          }),
        },
      },
    },
    registerUserHandler,
  );

  server.post(
    "/login",
    {
      onRequest: [server.csrfProtection],
      preHandler: [
        async () => {
          void sendLog({
            dataset: "server",
            level: "info",
            message: "Route visited: POST /login",
          });
        },
      ],
      config: {
        rateLimit: {
          max: 5,
          timeWindow: "5 minutes",
        },
      },
      schema: {
        tags: ["auth"],
        body: loginInputSchema,
        response: {
          200: z.union([
            z.object({
              id: z.string(),
              email: z.email(),
              name: z.string(),
              isTwoFactorEnabled: z.boolean(),
            }),
            z.object({
              message: z.string(),
              code: z.literal("TWO_FACTOR_REQUIRED"),
              pendingUserId: z.string(),
            }),
          ]),
          401: z.object({ message: z.string() }),
          403: z.object({
            message: z.string(),
            code: z.literal("EMAIL_NOT_VERIFIED"),
          }),
        },
      },
    },
    loginUserHandler,
  );

  server.post(
    "/logout",
    {
      onRequest: [server.csrfProtection],
      preHandler: [
        authenticate,
        async () => {
          void sendLog({
            dataset: "server",
            level: "info",
            message: "Route visited: POST /logout",
          });
        },
      ],
      schema: {
        tags: ["auth"],
        response: {
          200: z.object({ message: z.string() }),
          401: z.object({ message: z.string() }),
        },
      },
    },
    logoutUserHandler,
  );

  server.get(
    "/google",
    {
      schema: {
        tags: ["auth"],
      },
    },
    googleLoginHandler,
  );

  server.get(
    "/google/callback",
    {
      schema: {
        tags: ["auth"],
      },
    },
    googleCallbackHandler,
  );

  server.post(
    "/verify-email",
    {
      onRequest: [
        async () => {
          void sendLog({
            dataset: "server",
            level: "info",
            message: "Route visited: POST /verify-email",
          });
        },
      ],
      schema: {
        tags: ["auth"],
        body: verifyEmailSchema,
        response: {
          200: z.object({
            message: z.string(),
            code: z.literal("EMAIL_CHANGED").optional(),
          }),
          400: z.object({ message: z.string() }),
          409: z.object({ message: z.string() }),
          500: z.object({ message: z.string() }),
        },
      },
    },
    verifyEmailHandler,
  );

  server.post(
    "/resend-verification",
    {
      onRequest: [
        async () => {
          void sendLog({
            dataset: "server",
            level: "info",
            message: "Route visited: POST /resend-verification",
          });
        },
      ],
      config: {
        rateLimit: {
          max: 3,
          timeWindow: "15 minutes",
        },
      },
      schema: {
        tags: ["auth"],
        body: resendVerificationSchema,
        response: {
          200: z.object({ message: z.string() }),
          400: z.object({ message: z.string() }),
          500: z.object({ message: z.string() }),
        },
      },
    },
    resendVerificationEmailHandler,
  );

  server.post(
    "/forgot-password",
    {
      config: {
        rateLimit: {
          max: 3,
          timeWindow: "15 minutes",
        },
      },
      schema: {
        tags: ["auth"],
        body: emailSchema,
        response: {
          200: z.object({ message: z.string() }),
          400: z.object({ message: z.string() }),
          500: z.object({ message: z.string() }),
        },
      },
    },
    forgotPasswordHandler,
  );

  server.post(
    "/reset-password",
    {
      config: {
        rateLimit: {
          max: 5,
          timeWindow: "15 minutes",
        },
      },
      schema: {
        tags: ["auth"],
        body: resetPasswordSchema,
        response: {
          200: z.object({ message: z.string() }),
          400: z.object({ message: z.string() }),
          500: z.object({ message: z.string() }),
        },
      },
    },
    resetPasswordHandler,
  );

  server.get(
    "/csrf",
    {
      schema: {
        tags: ["auth"],
      },
    },
    async (_request, reply) => {
      const csrfToken = reply.generateCsrf();
      void sendLog({
        dataset: "security",
        level: "info",
        message: "CSRF token issued",
      });
      return { csrfToken: csrfToken };
    },
  );
};

export default authRoute;
