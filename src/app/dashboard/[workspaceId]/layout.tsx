import { redirect } from "next/navigation";

import { Sidebar } from "@/components/dashboard/sidebar";
import { MobileSidebar } from "@/components/dashboard/mobile-sidebar";
import { PendingInvitesBanner } from "@/components/dashboard/pending-invites-banner";
import {
  requireWorkspaceAccess,
  WorkspaceAccessError,
} from "@/lib/auth/workspace-access";
import { getUserWorkspaces, getPendingInvitesForUser } from "@/lib/workspace/queries";
import { prisma } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";

export default async function WorkspaceLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ workspaceId: string }>;
}) {
  const { workspaceId } = await params;

  try {
    await requireWorkspaceAccess(workspaceId);
  } catch (err) {
    if (err instanceof WorkspaceAccessError) {
      redirect("/dashboard");
    }
    throw err;
  }

  const { userId } = await auth();
  const [workspaces, pendingInvites, settings] = await Promise.all([
    getUserWorkspaces(),
    getPendingInvitesForUser(),
    userId
      ? prisma.settings.findUnique({ where: { userId } })
      : Promise.resolve(null),
  ]);

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar
        workspaceId={workspaceId}
        workspaces={workspaces}
        initialCollapsed={settings?.sidebarCollapsed ?? false}
      />
      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex items-center gap-2 border-b px-3 py-2 md:hidden">
          <MobileSidebar workspaceId={workspaceId} workspaces={workspaces} />
          <span className="text-sm font-semibold">ProductivityHub</span>
        </header>
        {pendingInvites.length > 0 && (
          <PendingInvitesBanner invites={pendingInvites} />
        )}
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
