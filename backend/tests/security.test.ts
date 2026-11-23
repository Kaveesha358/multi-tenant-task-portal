import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import app from "../src/app";
import { prisma } from "../src/lib/prisma";
import { resetDb, createUser, auth, type TestUser } from "./helpers";

describe("authentication", () => {
  beforeAll(resetDb);

  it("rejects requests without a token", async () => {
    const res = await request(app).get("/api/auth/me");
    expect(res.status).toBe(401);
  });

  it("rejects a garbage token", async () => {
    const res = await request(app)
      .get("/api/auth/me")
      .set(auth("not-a-real-token"));
    expect(res.status).toBe(401);
  });

  it("does not return the password hash on register", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send({ email: "a@test.com", name: "A", password: "password123" });
    expect(res.status).toBe(201);
    expect(res.body.passwordHash).toBeUndefined();
  });

  it("rejects a duplicate email", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send({ email: "a@test.com", name: "A", password: "password123" });
    expect(res.status).toBe(409);
  });

  it("rejects a short password", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send({ email: "b@test.com", name: "B", password: "123" });
    expect(res.status).toBe(400);
  });

  it("gives the same error for wrong password and unknown email", async () => {
    const wrongPassword = await request(app)
      .post("/api/auth/login")
      .send({ email: "a@test.com", password: "wrong-password" });
    const unknownEmail = await request(app)
      .post("/api/auth/login")
      .send({ email: "nobody@test.com", password: "password123" });

    expect(wrongPassword.status).toBe(401);
    expect(unknownEmail.status).toBe(401);
    expect(wrongPassword.body).toEqual(unknownEmail.body);
  });
});

describe("RBAC and tenant isolation", () => {
  let admin: TestUser;
  let member: TestUser;
  let viewer: TestUser;
  let outsider: TestUser;
  let wsId: string;
  let otherWsId: string;
  let projectId: string;
  let taskId: string;

  const w = (id: string) => `/api/workspaces/${id}`;

  beforeAll(async () => {
    await resetDb();

    admin = await createUser("Admin");
    member = await createUser("Member");
    viewer = await createUser("Viewer");
    outsider = await createUser("Outsider");

    // ABC workspace (admin) with a member and a viewer
    const ws = await request(app)
      .post("/api/workspaces")
      .set(auth(admin.token))
      .send({ name: "ABC Company" });
    wsId = ws.body.id;

    await request(app)
      .post(`${w(wsId)}/members`)
      .set(auth(admin.token))
      .send({ email: member.email, role: "MEMBER" });
    await request(app)
      .post(`${w(wsId)}/members`)
      .set(auth(admin.token))
      .send({ email: viewer.email, role: "VIEWER" });

    const project = await request(app)
      .post(`${w(wsId)}/projects`)
      .set(auth(admin.token))
      .send({ name: "Website Redesign" });
    projectId = project.body.id;

    const task = await request(app)
      .post(`${w(wsId)}/projects/${projectId}/tasks`)
      .set(auth(admin.token))
      .send({ title: "Design homepage" });
    taskId = task.body.id;

    // XYZ workspace, owned by the outsider
    const other = await request(app)
      .post("/api/workspaces")
      .set(auth(outsider.token))
      .send({ name: "XYZ Company" });
    otherWsId = other.body.id;
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  //           roles

  it("viewer can read tasks", async () => {
    const res = await request(app)
      .get(`${w(wsId)}/projects/${projectId}/tasks`)
      .set(auth(viewer.token));
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
  });

  it("viewer cannot create tasks", async () => {
    const res = await request(app)
      .post(`${w(wsId)}/projects/${projectId}/tasks`)
      .set(auth(viewer.token))
      .send({ title: "Hack" });
    expect(res.status).toBe(403);
  });

  it("viewer cannot add members", async () => {
    const res = await request(app)
      .post(`${w(wsId)}/members`)
      .set(auth(viewer.token))
      .send({ email: outsider.email, role: "ADMIN" });
    expect(res.status).toBe(403);
  });

  it("viewer cannot read the audit log", async () => {
    const res = await request(app)
      .get(`${w(wsId)}/audit-logs`)
      .set(auth(viewer.token));
    expect(res.status).toBe(403);
  });

  it("member can create tasks", async () => {
    const res = await request(app)
      .post(`${w(wsId)}/projects/${projectId}/tasks`)
      .set(auth(member.token))
      .send({ title: "Member task" });
    expect(res.status).toBe(201);
  });

  it("member cannot delete tasks or projects", async () => {
    const delTask = await request(app)
      .delete(`${w(wsId)}/projects/${projectId}/tasks/${taskId}`)
      .set(auth(member.token));
    const delProject = await request(app)
      .delete(`${w(wsId)}/projects/${projectId}`)
      .set(auth(member.token));
    expect(delTask.status).toBe(403);
    expect(delProject.status).toBe(403);
  });

  it("the last admin cannot be removed", async () => {
    const res = await request(app)
      .delete(`${w(wsId)}/members/${admin.id}`)
      .set(auth(admin.token));
    expect(res.status).toBe(400);
  });

  //             tenant isolation 

  it("a non-member gets 404 for another workspace", async () => {
    const res = await request(app)
      .get(`${w(wsId)}/members`)
      .set(auth(outsider.token));
    expect(res.status).toBe(404);
  });

  it("workspace list only shows the user's own workspaces", async () => {
    const res = await request(app)
      .get("/api/workspaces")
      .set(auth(outsider.token));
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].name).toBe("XYZ Company");
  });

  it("cannot read another workspace's tasks through your own workspace", async () => {
    const res = await request(app)
      .get(`${w(otherWsId)}/projects/${projectId}/tasks`)
      .set(auth(outsider.token));
    expect(res.status).toBe(404);
  });

  it("cannot update another workspace's task through your own workspace", async () => {
    const res = await request(app)
      .patch(`${w(otherWsId)}/projects/${projectId}/tasks/${taskId}`)
      .set(auth(outsider.token))
      .send({ status: "DONE" });
    expect(res.status).toBe(404);
  });

  it("cannot delete another workspace's project through your own workspace", async () => {
    const res = await request(app)
      .delete(`${w(otherWsId)}/projects/${projectId}`)
      .set(auth(outsider.token));
    expect(res.status).toBe(404);

    const still = await request(app)
      .get(`${w(wsId)}/projects`)
      .set(auth(admin.token));
    expect(still.body).toHaveLength(1);
  });

  //                 audit log

  it("logs a status change but not other edits", async () => {
    await request(app)
      .patch(`${w(wsId)}/projects/${projectId}/tasks/${taskId}`)
      .set(auth(admin.token))
      .send({ status: "DONE" });

    await request(app)
      .patch(`${w(wsId)}/projects/${projectId}/tasks/${taskId}`)
      .set(auth(admin.token))
      .send({ title: "Design homepage v2" });

    const res = await request(app)
      .get(`${w(wsId)}/audit-logs`)
      .set(auth(admin.token));

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].action).toBe("TASK_STATUS_CHANGED");
    expect(res.body[0].oldValue).toBe("TODO");
    expect(res.body[0].newValue).toBe("DONE");
  });
});