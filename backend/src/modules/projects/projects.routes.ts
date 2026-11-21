import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../../middleware/auth";
import { requireWorkspaceRole } from "../../middleware/workspace";
import { listProjects, createProject, deleteProject } from "./projects.service";

const router = Router({ mergeParams: true });

router.use(requireAuth);

const createSchema = z.object({
  name: z.string().trim().min(1).max(100),
  description: z.string().trim().max(500).optional(),
});

router.get(
  "/",
  requireWorkspaceRole("ADMIN", "MEMBER", "VIEWER"),
  async (_req, res) => {
    try {
      return res.json(await listProjects(res.locals.workspaceId));
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: "Something went wrong" });
    }
  }
);

router.post("/", requireWorkspaceRole("ADMIN", "MEMBER"), async (req, res) => {
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
    const { name, description } = parsed.data;
    const project = await createProject(res.locals.workspaceId, name, description);
    return res.status(201).json(project);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Something went wrong" });
  }
});

router.delete("/:projectId", requireWorkspaceRole("ADMIN"), async (req, res) => {
  try {
    await deleteProject(res.locals.workspaceId, String(req.params.projectId));
    return res.status(204).send();
  } catch (err) {
    if (err instanceof Error && err.message === "PROJECT_NOT_FOUND") {
      return res.status(404).json({ error: "Project not found" });
    }
    console.error(err);
    return res.status(500).json({ error: "Something went wrong" });
  }
});

export default router;