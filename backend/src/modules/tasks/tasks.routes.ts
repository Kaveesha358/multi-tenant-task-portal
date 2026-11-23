import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../../middleware/auth";
import { requireWorkspaceRole } from "../../middleware/workspace";
import { listTasks, createTask, updateTask, deleteTask } from "./tasks.service";

const router = Router({ mergeParams: true });

router.use(requireAuth);

const createSchema = z.object({
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().max(2000).optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH"]).optional(),
  dueDate: z.string().datetime().optional(),
  assigneeId: z.string().optional(),
});

const updateSchema = z
  .object({
    title: z.string().trim().min(1).max(200),
    description: z.string().trim().max(2000).nullable(),
    status: z.enum(["TODO", "IN_PROGRESS", "DONE"]),
    priority: z.enum(["LOW", "MEDIUM", "HIGH"]),
    dueDate: z.string().datetime().nullable(),
    assigneeId: z.string().nullable(),
  })
  .partial()
  .refine((v) => Object.keys(v).length > 0, { message: "No fields to update" });

function validationError(issues: { path: PropertyKey[]; message: string }[]) {
  return {
    errors: issues.map((i) => ({
      field: i.path.join("."),
      message: i.message,
    })),
  };
}

function handleError(err: unknown, res: import("express").Response) {
  if (err instanceof Error) {
    if (err.message === "PROJECT_NOT_FOUND") {
      return res.status(404).json({ error: "Project not found" });
    }
    if (err.message === "TASK_NOT_FOUND") {
      return res.status(404).json({ error: "Task not found" });
    }
    if (err.message === "ASSIGNEE_NOT_MEMBER") {
      return res.status(400).json({ error: "Assignee is not a member of this workspace" });
    }
  }
  console.error(err);
  return res.status(500).json({ error: "Something went wrong" });
}

router.get(
  "/",
  requireWorkspaceRole("ADMIN", "MEMBER", "VIEWER"),
  async (req, res) => {
    try {
      const tasks = await listTasks(
        res.locals.workspaceId,
        String(req.params.projectId)
      );
      return res.json(tasks);
    } catch (err) {
      return handleError(err, res);
    }
  }
);

router.post("/", requireWorkspaceRole("ADMIN", "MEMBER"), async (req, res) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json(validationError(parsed.error.issues));
  }

  try {
    const task = await createTask(
      res.locals.workspaceId,
      String(req.params.projectId),
      res.locals.userId,
      parsed.data
    );
    return res.status(201).json(task);
  } catch (err) {
    return handleError(err, res);
  }
});

router.patch(
  "/:taskId",
  requireWorkspaceRole("ADMIN", "MEMBER"),
  async (req, res) => {
    const parsed = updateSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json(validationError(parsed.error.issues));
    }

    try {
      const task = await updateTask(
        res.locals.workspaceId,
        String(req.params.projectId),
        String(req.params.taskId),
        res.locals.userId,
        parsed.data
      );
      return res.json(task);
    } catch (err) {
      return handleError(err, res);
    }
  }
);

router.delete("/:taskId", requireWorkspaceRole("ADMIN"), async (req, res) => {
  try {
    await deleteTask(
      res.locals.workspaceId,
      String(req.params.projectId),
      String(req.params.taskId)
    );
    return res.status(204).send();
  } catch (err) {
    return handleError(err, res);
  }
});

export default router;