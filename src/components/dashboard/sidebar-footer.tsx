import { useEffect, useState } from "react";
import { UserButton } from "@clerk/nextjs";

import { WorkspaceSwitcher } from "@/components/dashboard/workspace-switcher";

type Workspace = { id: string; name: string; role: string };

export function SidebarFooter({
  workspaces,
  currentWorkspaceId,
  collapsed,
}: {
  workspaces: Workspace[];
  currentWorkspaceId: string;
  collapsed?: boolean;
}) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div className="flex flex-col gap-2 border-t border-border/70 p-2">
      <WorkspaceSwitcher
        workspaces={workspaces}
        currentWorkspaceId={currentWorkspaceId}
        collapsed={collapsed}
      />
      <div className="flex items-center gap-2 px-1 min-h-[36px]">
        {mounted ? (
          <>
            <UserButton />
            {!collapsed && (
              <div>
                <span className="block text-sm font-medium">Account</span>
                <span className="block text-xs text-muted-foreground">Profile and sign out</span>
              </div>
            )}
          </>
        ) : (
          <div className="size-7 rounded-full bg-neutral-200 dark:bg-neutral-800 animate-pulse" />
        )}
      </div>
    </div>
  );
}
