import { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { prisma } from "../../lib/prisma.js";
import {
  getMeHandler,
  updateMeHandler,
  updateEmailHandler,
  updatePasswordHandler,
  exportUserDataHandler,
  deleteAccountHandler,
} from "./user.controller.js";
import {
  updateNameSchema,
  updateEmailSchema,
  updatePasswordSchema,
  exportDataSchema,
  deleteAccountSchema,
} from "./user.schema.js";
import { z } from "zod";
import { authenticate } from "../../middleware/authenticate.js";
import { env } from "../../config.js";
import { sendLog } from "../../lib/logstash.js";

// Path is prefixed with "/api/users"
const userRoute: FastifyPluginAsyncZod = async (server) => {
  // for testing. To delete later
  if (env.NODE_ENV === "development") {
    server.get(
      "/",
      {
        schema: {
          tags: ["user"],
        },
      },
      async () => {
        const users = prisma.user.findMany();
        return users;
      },
    );
  }

  server.get(
    "/me",
    {
      onRequest: [
        async () => {
          void sendLog({
            dataset: "server",
            level: "info",
            message: "Route visited: GET /me",
          });
        },
      ],
      preHandler: [authenticate],
      schema: {
        tags: ["user"],
        response: {
          200: z.object({
            user: z.object({
              id: z.string(),
              name: z.string(),
              email: z.email(),
              isTwoFactorEnabled: z.boolean(),
              isEmailVerified: z.boolean(),
              isGoogleLinked: z.boolean(),
              hasPassword: z.boolean(),
              recoveryCodesCount: z.number(),
            }),
          }),
          401: z.object({
            message: z.string(),
          }),
          404: z.object({
            message: z.string(),
          }),
        },
      },
    },
    getMeHandler,
  );

  server.patch(
    "/me",
    {
      onRequest: [server.csrfProtection],
      preHandler: [authenticate],
      schema: {
        tags: ["user"],
        body: updateNameSchema,
        response: {
          200: z.object({
            id: z.string(),
            name: z.string(),
          }),
          400: z.object({
            message: z.string(),
          }),
          401: z.object({
            message: z.string(),
          }),
          403: z.object({
            message: z.string(),
          }),
          500: z.object({
            message: z.string(),
          }),
        },
      },
    },
    updateMeHandler,
  );

  server.patch(
    "/email",
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
        tags: ["user"],
        body: updateEmailSchema,
        response: {
          200: z.object({
            message: z.string(),
          }),
          400: z.object({
            message: z.string(),
          }),
          401: z.object({
            message: z.string(),
          }),
          403: z.object({
            message: z.string(),
          }),
          409: z.object({
            message: z.string(), // Conflict: email already in use
          }),
          500: z.object({
            message: z.string(),
          }),
        },
      },
    },
    updateEmailHandler,
  );

  server.patch(
    "/password",
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
        tags: ["user"],
        body: updatePasswordSchema,
        response: {
          200: z.object({
            message: z.string(),
          }),
          400: z.object({
            message: z.string(),
          }),
          401: z.object({
            message: z.string(),
          }),
          403: z.object({
            message: z.string(),
          }),
          500: z.object({
            message: z.string(),
          }),
        },
      },
    },
    updatePasswordHandler,
  );

  server.post(
    "/export-data",
    {
      onRequest: [server.csrfProtection],
      preHandler: [authenticate],
      config: {
        rateLimit: {
          max: 3,
          timeWindow: "1 hour",
        },
      },
      schema: {
        tags: ["user"],
        body: exportDataSchema,
        response: {
          401: z.object({ message: z.string() }),
          400: z.object({ message: z.string() }),
		  404: z.object({ message: z.string() }),
          500: z.object({ message: z.string() }),
        },
      },
    },
    exportUserDataHandler,
  );

  server.post(
    "/delete-account",
    {
      onRequest: [server.csrfProtection],
      preHandler: [authenticate],
      config: {
        rateLimit: {
          max: 2,
          timeWindow: "1 hour",
        },
      },
      schema: {
        tags: ["user"],
        body: deleteAccountSchema,
        response: {
          200: z.object({ message: z.string() }),
          400: z.object({ message: z.string() }),
          401: z.object({ message: z.string() }),
          404: z.object({ message: z.string() }),
          500: z.object({ message: z.string() }),
        },
      },
    },
    deleteAccountHandler,
  );
};

export default userRoute;
