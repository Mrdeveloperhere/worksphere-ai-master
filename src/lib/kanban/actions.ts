"use server";

import { revalidatePath } from "next/cache";

import { ok, fail, type ActionResult } from "@/lib/action-result";
import { tryWorkspaceAccess } from "@/lib/auth/workspace-access";
import { prisma } from "@/lib/prisma";
import { DEFAULT_COLUMNS } from "@/lib/kanban/constants";
import {
  getWorkspaceIdForBoard,
  getWorkspaceIdForColumn,
  getWorkspaceIdForTask,
} from "@/lib/kanban/helpers";
import { getTaskComments } from "@/lib/kanban/queries";

// ---------- Boards ----------

export async function createBoard(
  workspaceId: string,
  name: string,
  color?: string,
): Promise<ActionResult<{ id: string }>> {
  if (!name.trim()) return fail("Board name is required");

  const access = await tryWorkspaceAccess(workspaceId);
  if (!access.ok) return fail(access.error);

  const boardCount = await prisma.board.count({ where: { workspaceId } });
  if (boardCount >= 3) {
    return fail("You have reached the limit of 3 boards allowed on the Free plan. Please upgrade to create more boards.");
  }

  const board = await prisma.board.create({
    data: {
      workspaceId,
      name: name.trim(),
      color: color || "#6366f1",
      createdById: access.userId,
      columns: {
        create: DEFAULT_COLUMNS.map((columnName, index) => ({
          name: columnName,
          position: index,
        })),
      },
    },
  });

  revalidatePath(`/dashboard/${workspaceId}`);
  return ok({ id: board.id });
}

export async function renameBoard(
  boardId: string,
  name: string,
): Promise<ActionResult<void>> {
  if (!name.trim()) return fail("Board name is required");

  const workspaceId = await getWorkspaceIdForBoard(boardId);
  const access = await tryWorkspaceAccess(workspaceId);
  if (!access.ok) return fail(access.error);

  await prisma.board.update({ where: { id: boardId }, data: { name: name.trim() } });
  revalidatePath(`/dashboard/${workspaceId}/kanban/${boardId}`);
  return ok(undefined);
}

export async function recolorBoard(
  boardId: string,
  color: string,
): Promise<ActionResult<void>> {
  const workspaceId = await getWorkspaceIdForBoard(boardId);
  const access = await tryWorkspaceAccess(workspaceId);
  if (!access.ok) return fail(access.error);

  await prisma.board.update({ where: { id: boardId }, data: { color } });
  revalidatePath(`/dashboard/${workspaceId}/kanban/${boardId}`);
  return ok(undefined);
}

export async function getBoardDeletionImpact(
  boardId: string,
): Promise<ActionResult<{ columnCount: number; taskCount: number }>> {
  const workspaceId = await getWorkspaceIdForBoard(boardId);
  const access = await tryWorkspaceAccess(workspaceId);
  if (!access.ok) return fail(access.error);

  const [columnCount, taskCount] = await Promise.all([
    prisma.column.count({ where: { boardId } }),
    prisma.task.count({ where: { column: { boardId } } }),
  ]);

  return ok({ columnCount, taskCount });
}

export async function deleteBoard(boardId: string): Promise<ActionResult<void>> {
  const workspaceId = await getWorkspaceIdForBoard(boardId);
  const access = await tryWorkspaceAccess(workspaceId);
  if (!access.ok) return fail(access.error);

  await prisma.board.delete({ where: { id: boardId } });
  revalidatePath(`/dashboard/${workspaceId}`);
  return ok(undefined);
}

// ---------- Columns ----------

export async function createColumn(
  boardId: string,
  name: string,
): Promise<ActionResult<{ id: string }>> {
  if (!name.trim()) return fail("Column name is required");

  const workspaceId = await getWorkspaceIdForBoard(boardId);
  const access = await tryWorkspaceAccess(workspaceId);
  if (!access.ok) return fail(access.error);

  const maxPosition = await prisma.column.aggregate({
    where: { boardId },
    _max: { position: true },
  });

  const column = await prisma.column.create({
    data: {
      boardId,
      name: name.trim(),
      position: (maxPosition._max.position ?? -1) + 1,
    },
  });

  revalidatePath(`/dashboard/${workspaceId}/kanban/${boardId}`);
  return ok({ id: column.id });
}

export async function renameColumn(
  columnId: string,
  name: string,
): Promise<ActionResult<void>> {
  if (!name.trim()) return fail("Column name is required");

  const workspaceId = await getWorkspaceIdForColumn(columnId);
  const access = await tryWorkspaceAccess(workspaceId);
  if (!access.ok) return fail(access.error);

  await prisma.column.update({ where: { id: columnId }, data: { name: name.trim() } });
  revalidatePath(`/dashboard/${workspaceId}`);
  return ok(undefined);
}

export async function recolorColumn(
  columnId: string,
  color: string,
): Promise<ActionResult<void>> {
  const workspaceId = await getWorkspaceIdForColumn(columnId);
  const access = await tryWorkspaceAccess(workspaceId);
  if (!access.ok) return fail(access.error);

  await prisma.column.update({ where: { id: columnId }, data: { color } });
  revalidatePath(`/dashboard/${workspaceId}`);
  return ok(undefined);
}

export async function reorderColumns(
  boardId: string,
  orderedColumnIds: string[],
): Promise<ActionResult<void>> {
  const workspaceId = await getWorkspaceIdForBoard(boardId);
  const access = await tryWorkspaceAccess(workspaceId);
  if (!access.ok) return fail(access.error);

  await prisma.$transaction(
    orderedColumnIds.map((columnId, index) =>
      prisma.column.update({ where: { id: columnId }, data: { position: index } }),
    ),
  );

  revalidatePath(`/dashboard/${workspaceId}/kanban/${boardId}`);
  return ok(undefined);
}

export async function getColumnDeletionImpact(
  columnId: string,
): Promise<ActionResult<{ taskCount: number }>> {
  const workspaceId = await getWorkspaceIdForColumn(columnId);
  const access = await tryWorkspaceAccess(workspaceId);
  if (!access.ok) return fail(access.error);

  const taskCount = await prisma.task.count({ where: { columnId } });
  return ok({ taskCount });
}

export async function deleteColumn(columnId: string): Promise<ActionResult<void>> {
  const workspaceId = await getWorkspaceIdForColumn(columnId);
  const access = await tryWorkspaceAccess(workspaceId);
  if (!access.ok) return fail(access.error);

  const column = await prisma.column.findUniqueOrThrow({ where: { id: columnId } });
  await prisma.column.delete({ where: { id: columnId } });
  revalidatePath(`/dashboard/${workspaceId}/kanban/${column.boardId}`);
  return ok(undefined);
}

// ---------- Tasks ----------

export async function createTask(
  columnId: string,
  title: string,
): Promise<ActionResult<{ id: string }>> {
  if (!title.trim()) return fail("Task title is required");

  const workspaceId = await getWorkspaceIdForColumn(columnId);
  const access = await tryWorkspaceAccess(workspaceId);
  if (!access.ok) return fail(access.error);

  const taskCount = await prisma.task.count({
    where: { column: { board: { workspaceId } } },
  });
  if (taskCount >= 25) {
    return fail("You have reached the limit of 25 tasks allowed on the Free plan. Please upgrade to create more tasks.");
  }

  const maxPosition = await prisma.task.aggregate({
    where: { columnId },
    _max: { position: true },
  });

  const task = await prisma.task.create({
    data: {
      columnId,
      title: title.trim(),
      position: (maxPosition._max.position ?? -1) + 1,
      createdById: access.userId,
    },
  });

  revalidatePath(`/dashboard/${workspaceId}`);
  return ok({ id: task.id });
}

type UpdateTaskInput = {
  title?: string;
  description?: string | null;
  priority?: "LOW" | "MEDIUM" | "HIGH";
  dueDate?: Date | null;
  labels?: string[];
  assigneeId?: string | null;
};

export async function updateTask(
  taskId: string,
  data: UpdateTaskInput,
): Promise<ActionResult<void>> {
  if (data.title !== undefined && !data.title.trim()) {
    return fail("Task title is required");
  }

  const workspaceId = await getWorkspaceIdForTask(taskId);
  const access = await tryWorkspaceAccess(workspaceId);
  if (!access.ok) return fail(access.error);

  if (data.assigneeId) {
    const assigneeIsMember = await prisma.workspaceMember.findFirst({
      where: { workspaceId, userId: data.assigneeId, status: "ACTIVE" },
    });
    if (!assigneeIsMember) return fail("Assignee must be a member of this workspace");
  }

  await prisma.task.update({
    where: { id: taskId },
    data: { ...data, title: data.title?.trim() },
  });

  revalidatePath(`/dashboard/${workspaceId}`);
  return ok(undefined);
}

export async function deleteTask(taskId: string): Promise<ActionResult<void>> {
  const workspaceId = await getWorkspaceIdForTask(taskId);
  const access = await tryWorkspaceAccess(workspaceId);
  if (!access.ok) return fail(access.error);

  await prisma.task.delete({ where: { id: taskId } });
  revalidatePath(`/dashboard/${workspaceId}`);
  return ok(undefined);
}

// Drag-and-drop move: was originally a full re-sequence of every sibling in
// the target (and source) column per move. That's cheap in query cost but
// each sibling update is its own network round trip — fine on a local DB,
// but it meant 10+ sequential round trips per drag against a remote Neon
// instance (measured 3.6-7s per drag). Fractional positioning (position is
// a Float — see schema) drops this to a single targeted update: the moved
// task's new position is the midpoint between its new neighbors, so no
// other row ever needs to change.
export async function moveTask(
  taskId: string,
  toColumnId: string,
  toIndex: number,
): Promise<ActionResult<void>> {
  const [task, targetColumn] = await Promise.all([
    prisma.task.findUniqueOrThrow({
      where: { id: taskId },
      include: { column: { include: { board: true } } },
    }),
    prisma.column.findUniqueOrThrow({
      where: { id: toColumnId },
      include: {
        board: true,
        tasks: { where: { id: { not: taskId } }, orderBy: { position: "asc" } },
      },
    }),
  ]);

  const workspaceId = task.column.board.workspaceId;
  if (targetColumn.board.workspaceId !== workspaceId) {
    return fail("Cannot move a task to a column in a different workspace");
  }

  const access = await tryWorkspaceAccess(workspaceId);
  if (!access.ok) return fail(access.error);

  const siblings = targetColumn.tasks;
  const prev = siblings[toIndex - 1];
  const next = siblings[toIndex];
  const newPosition =
    !prev && !next ? 1 : !prev ? next.position / 2 : !next ? prev.position + 1 : (prev.position + next.position) / 2;

  await prisma.task.update({
    where: { id: taskId },
    data: { columnId: toColumnId, position: newPosition },
  });

  revalidatePath(`/dashboard/${workspaceId}`);
  return ok(undefined);
}

// ---------- Comments ----------

export type TaskCommentDTO = {
  id: string;
  content: string;
  createdAt: string;
  authorId: string;
  authorName: string;
};

export async function fetchTaskComments(
  taskId: string,
): Promise<ActionResult<TaskCommentDTO[]>> {
  const workspaceId = await getWorkspaceIdForTask(taskId);
  const access = await tryWorkspaceAccess(workspaceId);
  if (!access.ok) return fail(access.error);

  const comments = await getTaskComments(taskId);
  return ok(comments);
}

export async function addComment(
  taskId: string,
  content: string,
): Promise<ActionResult<{ id: string }>> {
  if (!content.trim()) return fail("Comment can't be empty");

  const workspaceId = await getWorkspaceIdForTask(taskId);
  const access = await tryWorkspaceAccess(workspaceId);
  if (!access.ok) return fail(access.error);

  const comment = await prisma.comment.create({
    data: { taskId, authorId: access.userId, content: content.trim() },
  });

  revalidatePath(`/dashboard/${workspaceId}`);
  return ok({ id: comment.id });
}

export async function deleteComment(commentId: string): Promise<ActionResult<void>> {
  const comment = await prisma.comment.findUniqueOrThrow({ where: { id: commentId } });
  const workspaceId = await getWorkspaceIdForTask(comment.taskId);
  const access = await tryWorkspaceAccess(workspaceId);
  if (!access.ok) return fail(access.error);

  if (comment.authorId !== access.userId) {
    return fail("You can only delete your own comments");
  }

  await prisma.comment.delete({ where: { id: commentId } });
  revalidatePath(`/dashboard/${workspaceId}`);
  return ok(undefined);
}
