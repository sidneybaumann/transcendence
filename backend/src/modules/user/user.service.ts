import { prisma } from "../../lib/prisma.js";

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

export async function updateUserNameById(id: string, name: string) {
  const updatedUser = await prisma.user.update({
    where: {
      id,
    },
    data: {
      name,
    },
  });

  return updatedUser;
}

export async function updatePasswordById(id: string, hashedPassword: string) {
  const updatedUser = await prisma.user.update({
    where: { id },
    data: { password: hashedPassword },
  });

  return updatedUser;
}