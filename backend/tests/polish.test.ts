import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import app from "../src/app";
import { prisma } from "../src/lib/prisma";
import { resetDb } from "./helpers";

describe("email normalization", () => {
  beforeAll(resetDb);

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("stores emails trimmed and in lowercase", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send({ email: "  MixedCase@Test.com ", name: "Mixed", password: "password123" });
    expect(res.status).toBe(201);
    expect(res.body.email).toBe("mixedcase@test.com");
  });

  it("rejects the same email with different casing", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send({ email: "MIXEDCASE@test.com", name: "Mixed", password: "password123" });
    expect(res.status).toBe(409);
  });

  it("lets the user log in with any casing", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "MIXEDCASE@TEST.COM", password: "password123" });
    expect(res.status).toBe(200);
    expect(res.body.accessToken).toBeTruthy();
  });
});

describe("CORS", () => {
  it("allows the configured frontend origin", async () => {
    const res = await request(app)
      .get("/health")
      .set("Origin", "http://localhost:5173");
    expect(res.headers["access-control-allow-origin"]).toBe("http://localhost:5173");
  });

  it("does not allow other origins", async () => {
    const res = await request(app)
      .get("/health")
      .set("Origin", "http://evil.example.com");
    expect(res.headers["access-control-allow-origin"]).toBeUndefined();
  });
});