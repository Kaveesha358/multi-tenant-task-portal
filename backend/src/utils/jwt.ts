import jwt from "jsonwebtoken";
import { randomUUID } from "node:crypto";

function getSecret(name: "JWT_ACCESS_SECRET" | "JWT_REFRESH_SECRET") {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not set`);
  return value;
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