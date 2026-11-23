import { prisma } from "../../lib/prisma";

export function listAuditLogs(workspaceId: string) {
  return prisma.auditLog.findMany({
    where: { workspaceId },
    orderBy: { createdAt: "desc" },
    take: 100,
    select: {
      id: true,
      action: true,
      entityType: true,
      entityId: true,
      oldValue: true,
      newValue: true,
      createdAt: true,
      user: { select: { id: true, name: true, email: true } },
    },
  });
}