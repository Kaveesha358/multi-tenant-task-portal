import request from "supertest";
import app from "../src/app";
import { prisma } from "../src/lib/prisma";

export interface TestUser {
  id: string;
  email: string;
  token: string;
}

export async function resetDb() {
  await prisma.$executeRawUnsafe(`TRUNCATE TABLE "User", "Workspace" CASCADE`);
}

export async function createUser(name: string): Promise<TestUser> {
  const email = `${name.toLowerCase()}@test.com`;

  await request(app)
    .post("/api/auth/register")
    .send({ email, name, password: "password123" });

  const res = await request(app)
    .post("/api/auth/login")
    .send({ email, password: "password123" });

  return { id: res.body.user.id, email, token: res.body.accessToken };
}

export const auth = (token: string) => ({ Authorization: `Bearer ${token}` });