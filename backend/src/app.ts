import express from "express";
import cors from "cors";
import { config } from "./config";
import authRoutes from "./modules/auth/auth.routes";
import workspaceRoutes from "./modules/workspaces/workspaces.routes";
import projectRoutes from "./modules/projects/projects.routes";
import taskRoutes from "./modules/tasks/tasks.routes";
import auditRoutes from "./modules/audit/audit.routes";

const app = express();

// Only the configured frontend origin(s) may call this API from a browser
app.use(cors({ origin: config.CORS_ORIGIN.split(",").map((o) => o.trim()) }));
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use("/api/auth", authRoutes);
app.use("/api/workspaces", workspaceRoutes);
app.use("/api/workspaces/:workspaceId/projects", projectRoutes);
app.use("/api/workspaces/:workspaceId/projects/:projectId/tasks", taskRoutes);
app.use("/api/workspaces/:workspaceId/audit-logs", auditRoutes);

export default app;