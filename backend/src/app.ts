import express from "express";
import cors from "cors";
import authRoutes from "./modules/auth/auth.routes";
import workspaceRoutes from "./modules/workspaces/workspaces.routes";
import projectRoutes from "./modules/projects/projects.routes";
import taskRoutes from "./modules/tasks/tasks.routes";

const app = express();

app.use(cors());
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use("/api/auth", authRoutes);
app.use("/api/workspaces", workspaceRoutes);
app.use("/api/workspaces/:workspaceId/projects", projectRoutes);
app.use("/api/workspaces/:workspaceId/projects/:projectId/tasks", taskRoutes);

export default app;