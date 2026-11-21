import { prisma } from "../../lib/prisma";

type Role = "ADMIN" | "MEMBER" | "VIEWER";

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

export async function listMembers(workspaceId: string) {
  const rows = await prisma.workspaceMember.findMany({
    where: { workspaceId },
    select: {
      role: true,
      joinedAt: true,
      user: { select: { id: true, email: true, name: true } },
    },
    orderBy: { joinedAt: "asc" },
  });

  return rows.map((r) => ({ ...r.user, role: r.role, joinedAt: r.joinedAt }));
}

export async function addMember(workspaceId: string, email: string, role: Role) {
  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, email: true, name: true },
  });
  if (!user) throw new Error("USER_NOT_FOUND");

  const existing = await prisma.workspaceMember.findUnique({
    where: { userId_workspaceId: { userId: user.id, workspaceId } },
  });
  if (existing) throw new Error("ALREADY_MEMBER");

  await prisma.workspaceMember.create({
    data: { userId: user.id, workspaceId, role },
  });

  return { ...user, role };
}

export async function removeMember(workspaceId: string, userId: string) {
  const membership = await prisma.workspaceMember.findUnique({
    where: { userId_workspaceId: { userId, workspaceId } },
  });
  if (!membership) throw new Error("MEMBER_NOT_FOUND");

  if (membership.role === "ADMIN") {
    const admins = await prisma.workspaceMember.count({
      where: { workspaceId, role: "ADMIN" },
    });
    if (admins <= 1) throw new Error("LAST_ADMIN");
  }

  await prisma.workspaceMember.delete({
    where: { userId_workspaceId: { userId, workspaceId } },
  });
}