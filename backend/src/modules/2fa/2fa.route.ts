import { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import {
  twoFactorSetupHandler,
  twoFactorVerifyHandler,
  twoFactorVerifyLoginHandler,
  disableTwoFactorHandler,
  cancelTwoFactorSetupHandler,
} from "./2fa.controller.js";
import { z } from "zod";
import { authenticate } from "../../middleware/authenticate.js";
import {
  twoFactorCodeSchema,
  // twoFactorVerifyLoginSchema,
  otpOrRecoveryCodeSchema,
  twoFactorVerifyLoginSchema,
} from "./2fa.schema.js";

const twofactorRoute: FastifyPluginAsyncZod = async (server) => {
  server.post(
    "/setup",
    {
      onRequest: [server.csrfProtection],
      preHandler: [authenticate],
      schema: {
        tags: ["2fa"],
        response: {
          200: z.object({
            message: z.string(),
            qrCodeDataUrl: z.string(),
            manualKey: z.string(),
          }),
          400: z.object({ message: z.string() }),
          500: z.object({ message: z.string() }),
        },
      },
    },
    twoFactorSetupHandler,
  );

  server.post(
    "/verify-setup",
    {
      onRequest: [server.csrfProtection],
      preHandler: [authenticate],
      config: {
        rateLimit: {
          max: 5,
          timeWindow: "10 minutes",
        },
      },
      schema: {
        tags: ["2fa"],
        body: twoFactorCodeSchema,
        response: {
          200: z.object({
            message: z.string(),
            recoveryCodes: z.array(z.string()),
          }),
          400: z.object({ message: z.string() }),
          500: z.object({ message: z.string() }),
        },
      },
    },
    twoFactorVerifyHandler,
  );

  server.post(
    "/verify-login",
    {
      onRequest: [server.csrfProtection],
      config: {
        rateLimit: {
          max: 5,
          timeWindow: "5 minutes",
        },
      },
      schema: {
        tags: ["2fa"],
        body: twoFactorVerifyLoginSchema,
        response: {
          200: z.object({
            id: z.string(),
            email: z.email(),
            name: z.string(),
            isTwoFactorEnabled: z.boolean(),
          }),
          400: z.object({ message: z.string() }),
          500: z.object({ message: z.string() }),
        },
      },
    },
    twoFactorVerifyLoginHandler,
  );

  server.post(
    "/disable",
    {
      onRequest: [server.csrfProtection],
      preHandler: [authenticate],
      config: {
        rateLimit: {
          max: 5,
          timeWindow: "15 minutes",
        },
      },
      schema: {
        tags: ["2fa"],
        body: otpOrRecoveryCodeSchema,
        response: {
          200: z.object({ message: z.string() }),
          400: z.object({ message: z.string() }),
          500: z.object({ message: z.string() }),
        },
      },
    },
    disableTwoFactorHandler,
  );

  server.post(
    "/cancel-setup",
    {
      onRequest: [server.csrfProtection],
      preHandler: [authenticate],
      schema: {
        tags: ["2fa"],
        response: {
          200: z.object({ message: z.string() }),
          400: z.object({ message: z.string() }),
          500: z.object({ message: z.string() }),
        },
      },
    },
    cancelTwoFactorSetupHandler,
  );
};

export default twofactorRoute;
