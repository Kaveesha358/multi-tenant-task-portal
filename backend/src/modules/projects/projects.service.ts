import { prisma } from "../../lib/prisma";

const projectSelect = {
  id: true,
  name: true,
  description: true,
  createdAt: true,
} as const;

export function listProjects(workspaceId: string) {
  return prisma.project.findMany({
    where: { workspaceId },
    select: projectSelect,
    orderBy: { createdAt: "asc" },
  });
}

export function createProject(
  workspaceId: string,
  name: string,
  description?: string
) {
  return prisma.project.create({
    data: { workspaceId, name, description },
    select: projectSelect,
  });
}

export async function deleteProject(workspaceId: string, projectId: string) {
  const result = await prisma.project.deleteMany({
    where: { id: projectId, workspaceId },
  });
  if (result.count === 0) throw new Error("PROJECT_NOT_FOUND");
}