import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

import { requireWorkspaceAccess } from "@/lib/auth/workspace-access";
import { prisma } from "@/lib/prisma";
import { listCategories } from "@/lib/categories/actions";
import { SettingsView } from "@/components/settings/settings-view";

export default async function SettingsPage({
  params,
}: {
  params: Promise<{ workspaceId: string }>;
}) {
  const { workspaceId } = await params;
  await requireWorkspaceAccess(workspaceId);

  const clerkUser = await currentUser();
  if (!clerkUser) {
    redirect("/sign-in");
  }

  // Fetch current database counts for limit meters
  const [workspace, settings, boardsCount, tasksCount, notesCount, spacesCount, whiteboardsCount] = await Promise.all([
    prisma.workspace.findUnique({ where: { id: workspaceId }, select: { plan: true } }),
    prisma.settings.findUnique({ where: { userId: clerkUser.id } }),
    prisma.board.count({ where: { workspaceId } }),
    prisma.task.count({ where: { column: { board: { workspaceId } } } }),
    prisma.note.count({ where: { workspaceId, isTrashed: false } }),
    prisma.space.count({ where: { workspaceId } }),
    prisma.whiteboard.count({ where: { workspaceId } }),
  ]);

  // Fetch/seed categories
  const categoriesRes = await listCategories(workspaceId);
  const categories = categoriesRes.success && categoriesRes.data ? categoriesRes.data : [];

  const userName = `${clerkUser.firstName ?? ""} ${clerkUser.lastName ?? ""}`.trim() || "Workspace User";
  const userEmail = clerkUser.emailAddresses[0]?.emailAddress || "";
  const userImage = clerkUser.imageUrl || "";

  return (
    <SettingsView
      workspaceId={workspaceId}
      user={{
        name: userName,
        email: userEmail,
        image: userImage,
      }}
      initialCategories={categories}
      currentPlan={workspace?.plan || "free"}
      initialSettings={settings}
      limits={{
        boards: boardsCount,
        tasks: tasksCount,
        notes: notesCount,
        spaces: spacesCount,
        whiteboards: whiteboardsCount,
      }}
    />
  );
}
