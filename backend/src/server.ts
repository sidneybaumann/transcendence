import Fastify from "fastify";
import userRoutes from "./modules/user/user.route.js";
import authRoutes from "./modules/auth/auth.route.js";
import twofactorRoutes from "./modules/2fa/2fa.route.js";
import { prisma } from "./lib/prisma.js";
import {
  jsonSchemaTransform,
  serializerCompiler,
  validatorCompiler,
  ZodTypeProvider,
} from "fastify-type-provider-zod";
import fastifySwagger from "@fastify/swagger";
import fastifySwaggerUi from "@fastify/swagger-ui";
import fastifyJwt from "@fastify/jwt";
import { env } from "./config.js";
import fastifyCookie from "@fastify/cookie";
import fastifyCsrfProtection from "@fastify/csrf-protection";
import fastifyMetrics from "fastify-metrics";
import { sendLog } from "./lib/logstash.js";

const server = Fastify({ logger: true }).withTypeProvider<ZodTypeProvider>(); // This 'server' now carries the 'Zod' DNA throughout the whole app. Now 'server' is a special instance of fastify and permanently Zod-aware

server.setValidatorCompiler(validatorCompiler); // Add zod schema validator and serializer
server.setSerializerCompiler(serializerCompiler);

await server.register(import("@fastify/rate-limit"), {
  global: false,
});

server.register(fastifyCookie, {
  secret: env.COOKIE_SECRET,
});

server.register(fastifyCsrfProtection, {
  cookieOpts: {
    httpOnly: true,
    path: "/",
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
  },
});

// server.register(fastifyCsrfProtection, {
//   cookieOpts: { httpOnly: true }, // 'cookieOpts' will set a 'Set-Cookie' header when 'reply.generateCsrf() run. 'httpOnly' instructs the browser to prevent any client-side JavaScript (like document.cookie) from accessing that specific cookie.
// });

server.register(fastifyJwt, {
  secret: env.JWT_SECRET,
  cookie: {
    cookieName: "authJwt", // By default, jwt plugin will search the token at the 'Authorization: Bearer <token>' header. With the option 'cookie', we tell jwt to look for the token at the cookie named 'authJwt'. We create that token in user.controller
    signed: false, // We aren't signing the cookie (signing the JWT is enough)
  },
});

server.register(fastifyMetrics as any, {
  endpoint: '/metrics'
});


server.register(fastifySwagger, {
  openapi: {
    info: {
      title: "Transcendence super exhaustive APIs",
      version: "1.0.0",
    },
    servers: [
      {
        url: "http://localhost:3000",
      },
    ],
    tags: [
      { name: "user", description: "User related end-points" },
      { name: "auth", description: "Authentication-related endpoints" },
	  { name: "2fa", description: "Two-factor authentication-related endpoints" },
    ],
  },
  transform: jsonSchemaTransform,
});

server.register(fastifySwaggerUi, {
  routePrefix: "/documentation",
});


// Assembly the plugin 'userRoutes' to the server instance (the engine). Do not register plugin in main function, main should only handles the starting of the "engine"
server.register(userRoutes, { prefix: "/api/users" });
server.register(authRoutes, { prefix: "/api/auth" });
server.register(twofactorRoutes, { prefix: "/api/2fa" });

server.get("/healthcheck", async (_request, reply) => {
  reply.send({ superMessage: "Success" });
});

// Global error handler:
// - logs full server-side error details
// - customizes CSRF-related responses
// - preserves Fastify/client error status codes
// - avoids leaking internal details for 500 errors
server.setErrorHandler((error, request, reply) => {
  request.log.error(error);

  const statusCode =
    typeof (error as { statusCode?: unknown }).statusCode === "number"
      ? (error as { statusCode: number }).statusCode
      : 500;

  if (error instanceof Error) {
    const message = error.message.toLowerCase();

    if (message.includes("csrf")) {
      return reply.status(403).send({
        message: "Security check failed. Please refresh the page and try again.",
      });
    }
  }

  if (statusCode >= 500) {
    return reply.status(statusCode).send({
      message: "Internal Server Error",
    });
  }

  return reply.status(statusCode).send({
    message: error instanceof Error ? error.message : "Request failed",
  });
});

// Graceful shutdown
const listeners = ["SIGINT", "SIGTERM"];
listeners.forEach((signal) => {
  process.on(signal, async () => {
    try {
      await server.close();
      await prisma.$disconnect();
      server.log.info("Server closed gracefully");
      void sendLog({
        dataset: "server",
        level: "info",
        message: "Backend server stopped gracefully",
      });
      process.exit(0);
    } catch (err) {
      server.log.error(err);
      process.exit(1);
    }
  });
});

async function main() {
  try {
    await server.listen({ port: 3000, host: "0.0.0.0" });
    void sendLog({
      dataset: "server",
      level: "info",
      message: "Backend server started",
    });
  } catch (err) {
    console.log(err);
    void sendLog({
      dataset: "errors",
      level: "error",
      message: "Backend server failed to start",
    });
    process.exit(1);
  }
}

main();
