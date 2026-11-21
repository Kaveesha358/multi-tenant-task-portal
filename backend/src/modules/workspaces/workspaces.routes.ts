import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../../middleware/auth";
import { requireWorkspaceRole } from "../../middleware/workspace";
import {
  createWorkspace,
  listMyWorkspaces,
  listMembers,
  addMember,
  removeMember,
} from "./workspaces.service";

const router = Router();

router.use(requireAuth);

const createSchema = z.object({
  name: z.string().trim().min(1).max(100),
});

const addMemberSchema = z.object({
  email: z.string().email(),
  role: z.enum(["ADMIN", "MEMBER", "VIEWER"]),
});

router.post("/", async (req, res) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      errors: parsed.error.issues.map((i) => ({
        field: i.path.join("."),
        message: i.message,
      })),
    });
  }

  try {
    const workspace = await createWorkspace(res.locals.userId, parsed.data.name);
    return res.status(201).json(workspace);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Something went wrong" });
  }
});

router.get("/", async (_req, res) => {
  try {
    const workspaces = await listMyWorkspaces(res.locals.userId);
    return res.json(workspaces);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Something went wrong" });
  }
});

router.get(
  "/:workspaceId/members",
  requireWorkspaceRole("ADMIN", "MEMBER", "VIEWER"),
  async (_req, res) => {
    try {
      const members = await listMembers(res.locals.workspaceId);
      return res.json(members);
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: "Something went wrong" });
    }
  }
);

router.post(
  "/:workspaceId/members",
  requireWorkspaceRole("ADMIN"),
  async (req, res) => {
    const parsed = addMemberSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        errors: parsed.error.issues.map((i) => ({
          field: i.path.join("."),
          message: i.message,
        })),
      });
    }

    try {
      const { email, role } = parsed.data;
      const member = await addMember(res.locals.workspaceId, email, role);
      return res.status(201).json(member);
    } catch (err) {
      if (err instanceof Error && err.message === "USER_NOT_FOUND") {
        return res.status(404).json({ error: "No user with that email" });
      }
      if (err instanceof Error && err.message === "ALREADY_MEMBER") {
        return res.status(409).json({ error: "Already a member" });
      }
      console.error(err);
      return res.status(500).json({ error: "Something went wrong" });
    }
  }
);

router.delete(
  "/:workspaceId/members/:userId",
  requireWorkspaceRole("ADMIN"),
  async (req, res) => {
    try {
      await removeMember(res.locals.workspaceId, String(req.params.userId));
      return res.status(204).send();
    } catch (err) {
      if (err instanceof Error && err.message === "MEMBER_NOT_FOUND") {
        return res.status(404).json({ error: "Member not found" });
      }
      if (err instanceof Error && err.message === "LAST_ADMIN") {
        return res.status(400).json({ error: "Cannot remove the last admin" });
      }
      console.error(err);
      return res.status(500).json({ error: "Something went wrong" });
    }
  }
);

export default router;