import type { Request, Response, NextFunction } from "express";
import { prisma } from "../lib/prisma";

export type WorkspaceRole = "ADMIN" | "MEMBER" | "VIEWER";

export function requireWorkspaceRole(...allowed: WorkspaceRole[]) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const workspaceId = String(req.params.workspaceId);

      const membership = await prisma.workspaceMember.findUnique({
        where: {
          userId_workspaceId: { userId: res.locals.userId, workspaceId },
        },
        select: { role: true },
      });

      if (!membership) {
        res.status(404).json({ error: "Workspace not found" });
        return;
      }

      if (!allowed.includes(membership.role)) {
        res.status(403).json({ error: "Forbidden" });
        return;
      }

      res.locals.workspaceId = workspaceId;
      res.locals.role = membership.role;
      next();
    } catch (err) {
      next(err);
    }
  };
}