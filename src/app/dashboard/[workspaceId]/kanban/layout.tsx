import { requireWorkspaceAccess } from "@/lib/auth/workspace-access";
import { prisma } from "@/lib/prisma";
import { BoardsSidebar } from "@/components/kanban/boards-sidebar";

export default async function KanbanLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ workspaceId: string }>;
}) {
  const { workspaceId } = await params;
  await requireWorkspaceAccess(workspaceId);

  const boards = await prisma.board.findMany({
    where: { workspaceId },
    orderBy: { createdAt: "asc" },
  });

  return (
    <div className="flex h-full min-h-0 w-full overflow-hidden bg-[#FBF9F6] dark:bg-[#0C0C0D]">
      <BoardsSidebar workspaceId={workspaceId} initialBoards={boards} />
      <div className="flex-1 min-w-0 overflow-y-auto">
        {children}
      </div>
    </div>
  );
}
