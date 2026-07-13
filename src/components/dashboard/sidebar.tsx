"use client";

import { useEffect } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { SidebarNav } from "@/components/dashboard/sidebar-nav";
import { SidebarFooter } from "@/components/dashboard/sidebar-footer";
import { Button } from "@/components/ui/button";
import { useSidebarStore } from "@/lib/stores/sidebar-store";
import { updateSidebarCollapsed } from "@/lib/settings/actions";
import { cn } from "@/lib/utils";

type Workspace = { id: string; name: string; role: string };

export function Sidebar({
  workspaceId,
  workspaces,
  initialCollapsed,
}: {
  workspaceId: string;
  workspaces: Workspace[];
  initialCollapsed: boolean;
}) {
  const collapsed = useSidebarStore((s) => s.collapsed);
  const setCollapsed = useSidebarStore((s) => s.setCollapsed);

  useEffect(() => {
    setCollapsed(initialCollapsed);
    // Only hydrate from the server-persisted value once on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function toggle() {
    const next = !collapsed;
    setCollapsed(next);
    void updateSidebarCollapsed(next);
  }

  return (
    <aside
      className={cn(
        "hidden h-screen flex-col border-r border-border/70 bg-background/85 shadow-[0_0_40px_rgba(0,0,0,0.03)] backdrop-blur-xl transition-[width] md:flex",
        collapsed ? "w-16" : "w-64",
      )}
    >
      <div className="flex items-center justify-between px-3 py-4">
        {!collapsed && (
          <div>
            <p className="text-sm font-semibold tracking-tight">Flowbase</p>
            <p className="text-xs text-muted-foreground">Cozy workspace</p>
          </div>
        )}
        <Button variant="ghost" size="icon" onClick={toggle} className="ml-auto">
          {collapsed ? (
            <ChevronRight className="size-4" />
          ) : (
            <ChevronLeft className="size-4" />
          )}
        </Button>
      </div>
      <SidebarNav workspaceId={workspaceId} collapsed={collapsed} />
      <SidebarFooter
        workspaces={workspaces}
        currentWorkspaceId={workspaceId}
        collapsed={collapsed}
      />
    </aside>
  );
}
