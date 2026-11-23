import jwt from "jsonwebtoken";
import type { JwtPayload } from "jsonwebtoken";
import { randomUUID } from "node:crypto";

type SecretName = "JWT_ACCESS_SECRET" | "JWT_REFRESH_SECRET";

function getSecret(name: SecretName) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not set`);
  return value;
}

function subjectOf(payload: string | JwtPayload) {
  if (typeof payload === "string" || !payload.sub) {
    throw new Error("INVALID_TOKEN");
  }
  return payload.sub;
}

export function signAccessToken(userId: string) {
  return jwt.sign({ sub: userId }, getSecret("JWT_ACCESS_SECRET"), {
    expiresIn: "15m",
  });
}

export function signRefreshToken(userId: string) {
  return jwt.sign({ sub: userId }, getSecret("JWT_REFRESH_SECRET"), {
    expiresIn: "7d",
    jwtid: randomUUID(),
  });
}

export function verifyAccessToken(token: string) {
  return subjectOf(jwt.verify(token, getSecret("JWT_ACCESS_SECRET")));
}

export function verifyRefreshToken(token: string) {
  return subjectOf(jwt.verify(token, getSecret("JWT_REFRESH_SECRET")));
}