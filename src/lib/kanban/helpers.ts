import "server-only";

import { prisma } from "@/lib/prisma";

// Server actions on a column/task only receive that resource's ID from the
// client, not the workspaceId — these resolve the chain up to the workspace
// so requireWorkspaceAccess() can run the one shared authorization check.
export async function getWorkspaceIdForBoard(boardId: string) {
  const board = await prisma.board.findUniqueOrThrow({ where: { id: boardId } });
  return board.workspaceId;
}

export async function getWorkspaceIdForColumn(columnId: string) {
  const column = await prisma.column.findUniqueOrThrow({
    where: { id: columnId },
    include: { board: true },
  });
  return column.board.workspaceId;
}

export async function getWorkspaceIdForTask(taskId: string) {
  const task = await prisma.task.findUniqueOrThrow({
    where: { id: taskId },
    include: { column: { include: { board: true } } },
  });
  return task.column.board.workspaceId;
}
