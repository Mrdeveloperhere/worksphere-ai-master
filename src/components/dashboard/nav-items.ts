import type { LucideIcon } from "lucide-react";
import {
  Home,
  Sparkles,
  CalendarDays,
  Columns3,
  FileText,
  PenTool,
  BookOpen,
  Wand2,
  Settings,
} from "lucide-react";

export type NavItem = {
  label: string;
  href: (workspaceId: string) => string;
  icon: LucideIcon;
  comingSoon?: boolean;
};

export const NAV_ITEMS: NavItem[] = [
  { label: "Home", href: (w) => `/dashboard/${w}`, icon: Home },
  {
    label: "AI Assistant",
    href: (w) => `/dashboard/${w}/ai-assistant`,
    icon: Sparkles,
  },
  {
    label: "Calendar",
    href: (w) => `/dashboard/${w}/calendar`,
    icon: CalendarDays,
  },
  { label: "Tasks / Kanban", href: (w) => `/dashboard/${w}/kanban`, icon: Columns3 },
  {
    label: "Notes",
    href: (w) => `/dashboard/${w}/notes`,
    icon: FileText,
  },
  {
    label: "Whiteboard",
    href: (w) => `/dashboard/${w}/whiteboard`,
    icon: PenTool,
  },
  {
    label: "Pages",
    href: (w) => `/dashboard/${w}/pages`,
    icon: BookOpen,
  },
  {
    label: "AI Template Builder",
    href: (w) => `/dashboard/${w}/template-builder`,
    icon: Wand2,
  },
  { label: "Settings", href: (w) => `/dashboard/${w}/settings`, icon: Settings },
];
