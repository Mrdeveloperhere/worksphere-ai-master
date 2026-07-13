"use client";

import { Menu } from "lucide-react";

import { SidebarNav } from "@/components/dashboard/sidebar-nav";
import { SidebarFooter } from "@/components/dashboard/sidebar-footer";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useSidebarStore } from "@/lib/stores/sidebar-store";

type Workspace = { id: string; name: string; role: string };

export function MobileSidebar({
  workspaceId,
  workspaces,
}: {
  workspaceId: string;
  workspaces: Workspace[];
}) {
  const mobileOpen = useSidebarStore((s) => s.mobileOpen);
  const setMobileOpen = useSidebarStore((s) => s.setMobileOpen);

  return (
    <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="md:hidden">
          <Menu className="size-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="flex w-64 flex-col p-0">
        <SheetHeader className="px-3 py-4">
          <SheetTitle className="text-sm">ProductivityHub</SheetTitle>
        </SheetHeader>
        <SidebarNav workspaceId={workspaceId} onNavigate={() => setMobileOpen(false)} />
        <SidebarFooter workspaces={workspaces} currentWorkspaceId={workspaceId} />
      </SheetContent>
    </Sheet>
  );
}
