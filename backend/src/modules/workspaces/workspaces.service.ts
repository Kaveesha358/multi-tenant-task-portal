import { prisma } from "../../lib/prisma";

export function createWorkspace(userId: string, name: string) {
  return prisma.workspace.create({
    data: {
      name,
      members: { create: { userId, role: "ADMIN" } },
    },
    select: { id: true, name: true, createdAt: true },
  });
}

export async function listMyWorkspaces(userId: string) {
  const memberships = await prisma.workspaceMember.findMany({
    where: { userId },
    select: {
      role: true,
      workspace: { select: { id: true, name: true, createdAt: true } },
    },
    orderBy: { joinedAt: "asc" },
  });

  return memberships.map((m) => ({ ...m.workspace, role: m.role }));
}