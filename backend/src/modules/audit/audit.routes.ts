import { Router } from "express";
import { requireAuth } from "../../middleware/auth";
import { requireWorkspaceRole } from "../../middleware/workspace";
import { listAuditLogs } from "./audit.service";

const router = Router({ mergeParams: true });

router.use(requireAuth);

// Only admins can read the audit log
router.get("/", requireWorkspaceRole("ADMIN"), async (_req, res) => {
  try {
    return res.json(await listAuditLogs(res.locals.workspaceId));
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Something went wrong" });
  }
});

export default router;