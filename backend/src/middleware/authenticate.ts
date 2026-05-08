// This file should probably be moved to another folder.

import { FastifyReply, FastifyRequest } from "fastify";
import { prisma } from "../lib/prisma.js";
import { sendLog } from "../lib/logstash.js";

export const authenticate = async (request: FastifyRequest, reply: FastifyReply) => {
  try {
    await request.jwtVerify();
    const sessionId = request.user.sessionId;

    const session = await prisma.session.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      void sendLog({
        dataset: "security",
        level: "warn",
        message: "Missing session for authenticated request",
      });
      return reply.code(401).send({ message: "Unauthorized" });
    }

    if (session.revoked) {
      void sendLog({
        dataset: "security",
        level: "warn",
        message: "Revoked session access attempt",
      });
      return reply.code(401).send({ message: "Unauthorized" });
    }

    if (session.expiresAt < new Date()) {
      void sendLog({
        dataset: "security",
        level: "warn",
        message: "Expired session access attempt",
      });
      return reply.code(401).send({ message: "Unauthorized" });
    }

    void sendLog({
      dataset: "security",
      level: "info",
      message: "Authenticated request accepted",
    });
  } catch (err) {
    request.log.error(err);
    void sendLog({
      dataset: "security",
      level: "warn",
      message: "Invalid auth token or JWT verification failed",
    });
    return reply.code(401).send({ message: "Unauthorized" });
  }
};
