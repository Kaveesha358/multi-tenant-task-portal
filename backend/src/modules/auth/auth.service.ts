import { prisma } from "../../lib/prisma";
import { hashPassword, comparePassword } from "../../utils/hash";
import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} from "../../utils/jwt";

const REFRESH_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export async function registerUser(email: string, name: string, password: string) {
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    throw new Error("EMAIL_TAKEN");
  }

  const passwordHash = await hashPassword(password);

  return prisma.user.create({
    data: { email, name, passwordHash },
    select: { id: true, email: true, name: true, createdAt: true },
  });
}

export async function loginUser(email: string, password: string) {
  const user = await prisma.user.findUnique({ where: { email } });

  const passwordOk = user
    ? await comparePassword(password, user.passwordHash)
    : false;

  if (!user || !passwordOk) {
    throw new Error("INVALID_CREDENTIALS");
  }

  const accessToken = signAccessToken(user.id);
  const refreshToken = signRefreshToken(user.id);

  await prisma.refreshToken.create({
    data: {
      token: refreshToken,
      userId: user.id,
      expiresAt: new Date(Date.now() + REFRESH_TTL_MS),
    },
  });

  return {
    user: { id: user.id, email: user.email, name: user.name },
    accessToken,
    refreshToken,
  };
}

// Refresh token rotation: the old token is deleted, a new pair is issued.
export async function refreshSession(refreshToken: string) {
  let userId: string;
  try {
    userId = verifyRefreshToken(refreshToken);
  } catch {
    throw new Error("INVALID_REFRESH_TOKEN");
  }

  const stored = await prisma.refreshToken.findUnique({
    where: { token: refreshToken },
  });

  if (!stored || stored.userId !== userId || stored.expiresAt < new Date()) {
    throw new Error("INVALID_REFRESH_TOKEN");
  }

  const newAccessToken = signAccessToken(userId);
  const newRefreshToken = signRefreshToken(userId);

  return prisma.$transaction(async (tx) => {
    // If two requests race with the same token, only one can delete it
    const removed = await tx.refreshToken.deleteMany({
      where: { id: stored.id },
    });
    if (removed.count === 0) {
      throw new Error("INVALID_REFRESH_TOKEN");
    }

    await tx.refreshToken.create({
      data: {
        token: newRefreshToken,
        userId,
        expiresAt: new Date(Date.now() + REFRESH_TTL_MS),
      },
    });

    return { accessToken: newAccessToken, refreshToken: newRefreshToken };
  });
}

export async function logoutUser(refreshToken: string) {
  await prisma.refreshToken.deleteMany({ where: { token: refreshToken } });
}

export function getUserById(id: string) {
  return prisma.user.findUnique({
    where: { id },
    select: { id: true, email: true, name: true, createdAt: true },
  });
}