import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../../middleware/auth";
import { createWorkspace, listMyWorkspaces } from "./workspaces.service";

const router = Router();

router.use(requireAuth);

const createSchema = z.object({
  name: z.string().trim().min(1).max(100),
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

export default router;