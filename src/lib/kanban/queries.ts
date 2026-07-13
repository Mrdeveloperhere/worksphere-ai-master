import "server-only";

import { prisma } from "@/lib/prisma";

// Read-only lookups the AI agent calls to resolve names to IDs before it
// can call a mutating tool — e.g. it needs a columnId for create_task, but
// the user only said a column name ("put it in Done").
export async function listBoardsForWorkspace(workspaceId: string) {
  return prisma.board.findMany({
    where: { workspaceId },
    select: { id: true, name: true },
    orderBy: { createdAt: "asc" },
  });
}

export async function listColumnsForBoard(boardId: string) {
  return prisma.column.findMany({
    where: { boardId },
    select: { id: true, name: true },
    orderBy: { position: "asc" },
  });
}

export async function getBoardWithColumns(boardId: string) {
  return prisma.board.findUnique({
    where: { id: boardId },
    include: {
      columns: {
        orderBy: { position: "asc" },
        include: {
          tasks: {
            orderBy: { position: "asc" },
            include: { assignee: true },
          },
        },
      },
    },
  });
}

export async function getTaskComments(taskId: string) {
  const comments = await prisma.comment.findMany({
    where: { taskId },
    orderBy: { createdAt: "asc" },
    include: { author: true },
  });

  return comments.map((c) => ({
    id: c.id,
    content: c.content,
    createdAt: c.createdAt.toISOString(),
    authorId: c.authorId,
    authorName: c.author.name ?? c.author.email,
  }));
}

export async function getWorkspaceMembersForAssignment(workspaceId: string) {
  const members = await prisma.workspaceMember.findMany({
    where: { workspaceId, status: "ACTIVE" },
    include: { user: true },
  });

  return members
    .filter((m) => m.user)
    .map((m) => ({ id: m.user!.id, name: m.user!.name ?? m.user!.email }));
}
