import { prisma } from "../../lib/prisma";

type Status = "TODO" | "IN_PROGRESS" | "DONE";
type Priority = "LOW" | "MEDIUM" | "HIGH";

const taskSelect = {
  id: true,
  projectId: true,
  title: true,
  description: true,
  status: true,
  priority: true,
  dueDate: true,
  position: true,
  creatorId: true,
  assigneeId: true,
  createdAt: true,
  updatedAt: true,
} as const;

// Tenant isolation: the project must belong to this workspace
async function assertProject(workspaceId: string, projectId: string) {
  const project = await prisma.project.findFirst({
    where: { id: projectId, workspaceId },
    select: { id: true },
  });
  if (!project) throw new Error("PROJECT_NOT_FOUND");
}

// The assignee must be a member of this workspace
async function assertAssignee(workspaceId: string, assigneeId: string) {
  const member = await prisma.workspaceMember.findUnique({
    where: { userId_workspaceId: { userId: assigneeId, workspaceId } },
    select: { id: true },
  });
  if (!member) throw new Error("ASSIGNEE_NOT_MEMBER");
}

export async function listTasks(workspaceId: string, projectId: string) {
  await assertProject(workspaceId, projectId);
  return prisma.task.findMany({
    where: { projectId },
    select: taskSelect,
    orderBy: [{ position: "asc" }, { createdAt: "asc" }],
  });
}

export async function createTask(
  workspaceId: string,
  projectId: string,
  creatorId: string,
  input: {
    title: string;
    description?: string;
    priority?: Priority;
    dueDate?: string;
    assigneeId?: string;
  }
) {
  await assertProject(workspaceId, projectId);
  if (input.assigneeId) await assertAssignee(workspaceId, input.assigneeId);

  return prisma.task.create({
    data: {
      projectId,
      creatorId,
      title: input.title,
      description: input.description,
      priority: input.priority,
      dueDate: input.dueDate ? new Date(input.dueDate) : undefined,
      assigneeId: input.assigneeId,
    },
    select: taskSelect,
  });
}

export async function updateTask(
  workspaceId: string,
  projectId: string,
  taskId: string,
  input: {
    title?: string;
    description?: string | null;
    status?: Status;
    priority?: Priority;
    dueDate?: string | null;
    assigneeId?: string | null;
  }
) {
  // Tenant isolation: task -> project -> workspace must all match the URL
  const existing = await prisma.task.findFirst({
    where: { id: taskId, projectId, project: { workspaceId } },
    select: { id: true },
  });
  if (!existing) throw new Error("TASK_NOT_FOUND");

  if (input.assigneeId) await assertAssignee(workspaceId, input.assigneeId);

  return prisma.task.update({
    where: { id: taskId },
    data: {
      title: input.title,
      description: input.description,
      status: input.status,
      priority: input.priority,
      dueDate:
        input.dueDate === undefined
          ? undefined
          : input.dueDate === null
            ? null
            : new Date(input.dueDate),
      assigneeId: input.assigneeId,
    },
    select: taskSelect,
  });
}

export async function deleteTask(
  workspaceId: string,
  projectId: string,
  taskId: string
) {
  const result = await prisma.task.deleteMany({
    where: { id: taskId, projectId, project: { workspaceId } },
  });
  if (result.count === 0) throw new Error("TASK_NOT_FOUND");
}