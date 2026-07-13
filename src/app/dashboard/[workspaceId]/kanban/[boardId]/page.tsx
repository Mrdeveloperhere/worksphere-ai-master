import { notFound } from "next/navigation";
import { auth } from "@clerk/nextjs/server";

import { requireWorkspaceAccess } from "@/lib/auth/workspace-access";
import { getBoardWithColumns, getWorkspaceMembersForAssignment } from "@/lib/kanban/queries";
import { KanbanBoard } from "@/components/kanban/kanban-board";
import { prisma } from "@/lib/prisma";
import type { KanbanColumn, KanbanTask } from "@/lib/stores/kanban-store";

export default async function BoardPage({
  params,
}: {
  params: Promise<{ workspaceId: string; boardId: string }>;
}) {
  const { workspaceId, boardId } = await params;
  await requireWorkspaceAccess(workspaceId);
  const { userId } = await auth();

  const [board, assigneeOptions, members, access] = await Promise.all([
    getBoardWithColumns(boardId),
    getWorkspaceMembersForAssignment(workspaceId),
    prisma.workspaceMember.findMany({
      where: { workspaceId },
      orderBy: { invitedAt: "asc" },
    }),
    requireWorkspaceAccess(workspaceId),
  ]);

  if (!board || board.workspaceId !== workspaceId) {
    notFound();
  }

  const columns: KanbanColumn[] = board.columns.map((column) => ({
    id: column.id,
    name: column.name,
    color: column.color,
    position: column.position,
    tasks: column.tasks.map<KanbanTask>((task) => ({
      id: task.id,
      title: task.title,
      description: task.description,
      priority: task.priority,
      dueDate: task.dueDate ? task.dueDate.toISOString() : null,
      labels: task.labels,
      assigneeId: task.assigneeId,
      columnId: task.columnId,
      position: task.position,
    })),
  }));

  return (
    <KanbanBoard
      board={{
        id: board.id,
        name: board.name,
        color: board.color,
        workspaceId,
      }}
      initialColumns={columns}
      assigneeOptions={assigneeOptions}
      currentUserId={userId ?? ""}
      isOwner={access.membership.role === "OWNER"}
      initialMembers={members}
    />
  );
}
