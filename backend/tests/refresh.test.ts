import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import app from "../src/app";
import { prisma } from "../src/lib/prisma";
import { resetDb, auth } from "./helpers";

async function login() {
  const res = await request(app)
    .post("/api/auth/login")
    .send({ email: "refresh@test.com", password: "password123" });
  return {
    accessToken: res.body.accessToken as string,
    refreshToken: res.body.refreshToken as string,
  };
}

const refresh = (refreshToken: string) =>
  request(app).post("/api/auth/refresh").send({ refreshToken });

describe("refresh tokens and logout", () => {
  beforeAll(async () => {
    await resetDb();
    await request(app)
      .post("/api/auth/register")
      .send({ email: "refresh@test.com", name: "Refresh", password: "password123" });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("issues a new token pair and the new access token works", async () => {
    const first = await login();
    const res = await refresh(first.refreshToken);

    expect(res.status).toBe(200);
    expect(res.body.refreshToken).not.toBe(first.refreshToken);

    const me = await request(app)
      .get("/api/auth/me")
      .set(auth(res.body.accessToken));
    expect(me.status).toBe(200);
    expect(me.body.email).toBe("refresh@test.com");
  });

  it("does not allow a refresh token to be used twice (rotation)", async () => {
    const first = await login();
    const second = await refresh(first.refreshToken);
    expect(second.status).toBe(200);

    const reuse = await refresh(first.refreshToken);
    expect(reuse.status).toBe(401);

    // the newly issued token still works
    const third = await refresh(second.body.refreshToken);
    expect(third.status).toBe(200);
  });

  it("rejects a garbage refresh token", async () => {
    const res = await refresh("not-a-real-token");
    expect(res.status).toBe(401);
  });

  it("rejects an access token used as a refresh token", async () => {
    const { accessToken } = await login();
    const res = await refresh(accessToken);
    expect(res.status).toBe(401);
  });

  it("rejects an expired refresh token", async () => {
    const { refreshToken } = await login();
    await prisma.refreshToken.updateMany({
      where: { token: refreshToken },
      data: { expiresAt: new Date(Date.now() - 1000) },
    });

    const res = await refresh(refreshToken);
    expect(res.status).toBe(401);
  });

  it("logout invalidates the refresh token", async () => {
    const { refreshToken } = await login();

    const out = await request(app)
      .post("/api/auth/logout")
      .send({ refreshToken });
    expect(out.status).toBe(204);

    const res = await refresh(refreshToken);
    expect(res.status).toBe(401);
  });

  it("logout with an unknown token still returns 204", async () => {
    const res = await request(app)
      .post("/api/auth/logout")
      .send({ refreshToken: "unknown-token" });
    expect(res.status).toBe(204);
  });

  it("requires a refreshToken field", async () => {
    const res = await request(app).post("/api/auth/refresh").send({});
    expect(res.status).toBe(400);
  });
});