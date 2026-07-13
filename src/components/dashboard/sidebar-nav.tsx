"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Flame, X } from "lucide-react";

import { NAV_ITEMS } from "@/components/dashboard/nav-items";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useSidebarAppsStore } from "@/lib/stores/sidebar-apps-store";
import { toast } from "sonner";

type SidebarNavProps = {
  workspaceId: string;
  collapsed?: boolean;
  onNavigate?: () => void;
};

const GROUPS = [
  {
    title: "HOME",
    items: ["Home", "AI Assistant"],
  },
  {
    title: "WORKSPACE",
    items: ["Calendar", "Tasks / Kanban", "Notes", "Whiteboard", "Pages"],
  },
  {
    title: "BUILD",
    items: ["AI Template Builder", "Settings"],
  },
];

export function SidebarNav({ workspaceId, collapsed, onNavigate }: SidebarNavProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { apps, removeApp } = useSidebarAppsStore();

  return (
    <nav className="flex flex-1 flex-col gap-4 px-2 pt-1 overflow-y-auto">
      {GROUPS.map((group) => {
        // Find items in this group
        const groupItems = NAV_ITEMS.filter((item) => group.items.includes(item.label));

        return (
          <div key={group.title} className="space-y-1">
            {!collapsed && (
              <span className="px-3 text-[10px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-widest block mb-1">
                {group.title}
              </span>
            )}
            <div className="space-y-0.5">
              {groupItems.map((item) => {
                const href = item.href(workspaceId);
                const isActive = pathname === href;
                const Icon = item.icon;

                return (
                  <Link
                    key={item.label}
                    href={item.comingSoon ? "#" : href}
                    onClick={(e) => {
                      if (item.comingSoon) e.preventDefault();
                      else onNavigate?.();
                    }}
                    aria-disabled={item.comingSoon}
                    className={cn(
                      "flex items-center gap-3 rounded-2xl px-3 py-2 text-sm font-medium transition-all",
                      isActive
                        ? "border border-border/70 bg-background/80 text-foreground shadow-sm font-semibold"
                        : "text-muted-foreground hover:bg-accent/70 hover:text-accent-foreground",
                      item.comingSoon && "cursor-not-allowed opacity-50",
                    )}
                  >
                    <Icon className="size-4 shrink-0" />
                    {!collapsed && <span className="flex-1 truncate">{item.label}</span>}
                    {!collapsed && item.comingSoon && (
                      <Badge variant="secondary" className="text-[10px]">
                        Soon
                      </Badge>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        );
      })}

      {/* Dynamic GENERATED Apps Section */}
      {apps.length > 0 && (
        <div className="space-y-1">
          {!collapsed && (
            <span className="px-3 text-[10px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-widest block mb-1">
              GENERATED
            </span>
          )}
          <div className="space-y-0.5">
            {apps.map((app) => {
              const href = `/dashboard/${workspaceId}/template-builder?app=${app.id}`;
              const isActive = pathname.startsWith(`/dashboard/${workspaceId}/template-builder`) && 
                               new URLSearchParams(window.location.search).get("app") === app.id;

              return (
                <div
                  key={app.id}
                  className={cn(
                    "group flex items-center justify-between rounded-2xl px-3 py-2 text-sm font-medium transition-all cursor-pointer",
                    isActive
                      ? "border border-border/70 bg-background/80 text-foreground shadow-sm font-semibold"
                      : "text-muted-foreground hover:bg-accent/70 hover:text-accent-foreground"
                  )}
                  onClick={() => {
                    router.push(href);
                    onNavigate?.();
                  }}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div 
                      className="size-5 rounded-md flex items-center justify-center shrink-0"
                      style={{ backgroundColor: `${app.color}15` }}
                    >
                      <Flame className="size-3.5" style={{ color: app.color }} />
                    </div>
                    {!collapsed && <span className="truncate">{app.name}</span>}
                  </div>

                  {!collapsed && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        removeApp(app.id);
                        toast.success(`${app.name} removed from sidebar.`);
                      }}
                      className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 hover:bg-neutral-200 dark:hover:bg-neutral-800 rounded border-0 bg-transparent cursor-pointer"
                    >
                      <X className="size-3 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </nav>
  );
}
