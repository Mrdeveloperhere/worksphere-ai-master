import { redirect } from "next/navigation";
import { requireWorkspaceAccess } from "@/lib/auth/workspace-access";
import { prisma } from "@/lib/prisma";

export default async function KanbanIndexPage({
  params,
}: {
  params: Promise<{ workspaceId: string }>;
}) {
  const { workspaceId } = await params;
  await requireWorkspaceAccess(workspaceId);

  const boards = await prisma.board.findMany({
    where: { workspaceId },
    orderBy: { createdAt: "asc" },
  });

  if (boards.length > 0) {
    redirect(`/dashboard/${workspaceId}/kanban/${boards[0].id}`);
  }

  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 text-center p-6 bg-[#FBF9F6] dark:bg-[#0C0C0D]">
      <div className="space-y-2 max-w-sm">
        <h2 className="text-xl font-bold tracking-tight text-neutral-800 dark:text-neutral-100">
          No boards yet
        </h2>
        <p className="text-sm text-neutral-500 dark:text-neutral-400">
          Create a new board from the sidebar on the left to start organizing your tasks.
        </p>
      </div>
    </div>
  );
}
