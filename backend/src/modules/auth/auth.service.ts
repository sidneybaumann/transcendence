import { prisma } from "../../lib/prisma.js";
import { registrationInput } from "./auth.schema.js";
import ms, { type StringValue } from "ms";
import { env } from "../../config.js";

export async function createUser(body: registrationInput, hashedPassword: string) {
  const newUser = await prisma.user.create({
	data: {
	  email: body.email,
	  name: body.name,
	  password: hashedPassword,
	},
  }); // throws an error if creation fails (db is down for example)

  return newUser;
}

export async function createSession(userId: string) {
  const sessionDurationMs = ms(env.JWT_EXPIRATION as StringValue);

  const expiresAt = new Date(Date.now() + sessionDurationMs);

  const newSession = await prisma.session.create({
	data: {
	  userId,
	  expiresAt,
	},
  });

  return newSession;
}

export async function getUserByEmail(email: string) {
  const user = await prisma.user.findUnique({
	where: {
	  email: email,
	},
  });

  return user;
}

export async function getUserById(id: string) {
  const user = await prisma.user.findUnique({
	where: {
	  id,
	},
  });

  return user;
}

export async function getUserByGoogleId(googleId: string) {
  const user = await prisma.user.findUnique({
	where: {
	  googleId: googleId,
	},
  });

  return user;
}

export async function updateUserGoogleId(userId: string, googleId: string) {
  return prisma.user.update({
	where: { id: userId },
	data: {
	  googleId,
	  isEmailVerified: true,
	},
  });
}

export async function createGoogleUser(data: { email: string; name: string; googleId: string }) {
  return prisma.user.create({
	data: {
	  email: data.email,
	  name: data.name,
	  googleId: data.googleId,
	  isEmailVerified: true,
	  password: null,
	},
  });
}

export async function revokeAllSessionsByUserId(userId: string) {
  return prisma.session.updateMany({
    where: { userId },
    data: { revoked: true },
  });
}