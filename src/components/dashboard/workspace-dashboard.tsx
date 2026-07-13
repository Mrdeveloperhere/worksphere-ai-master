"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Sparkles,
  CalendarDays,
  Columns3,
  FileText,
  PenTool,
  BookOpen,
  Wand2,
  Calendar as CalendarIcon,
  Plus,
  Clock,
  AlertCircle,
  X
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createTask, updateTask } from "@/lib/kanban/actions";

interface UpcomingEvent {
  id: string;
  title: string;
  date: string;
  category: string;
  isTask: boolean;
}

interface ActivityItem {
  id: string;
  title: string;
  description: string;
  time: string;
  type: "task" | "calendar" | "note" | "whiteboard" | "page";
}

interface RecentItem {
  id: string;
  title: string;
  type: "kanban" | "whiteboard" | "note" | "page";
  secondaryInfo: string;
  updatedAt: string;
}

interface BoardColumn {
  id: string;
  name: string;
}

interface BoardWithColumns {
  id: string;
  name: string;
  columns: BoardColumn[];
}

interface WorkspaceDashboardProps {
  workspaceId: string;
  userName: string;
  totalTasks: number;
  completedTasks: number;
  completePercentage: number;
  upcomingCount: number;
  draftEventsCount: number;
  boardCount: number;
  noteCount: number;
  whiteboardCount: number;
  pageCount: number;
  actionCount: number;
  overdueTasksCount: number;
  todayEventsCount: number;
  upcomingEvents: UpcomingEvent[];
  recentActivities: ActivityItem[];
  recentItems: RecentItem[];
  boardsWithColumns: BoardWithColumns[];
}

function formatEventDate(dateStr: string) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  const weekday = d.toLocaleDateString("en-US", { weekday: "short" });
  const monthDay = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  const hasTime = d.getHours() !== 0 || d.getMinutes() !== 0;
  if (hasTime) {
    const time = d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
    return `${weekday}, ${monthDay}, ${time}`;
  }
  return `${weekday}, ${monthDay}`;
}

function formatActivityDate(dateStr: string) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  const datePart = d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
  const timePart = d.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit"
  });
  return `${datePart}, ${timePart}`;
}

export function WorkspaceDashboard({
  workspaceId,
  userName,
  totalTasks,
  completedTasks,
  completePercentage,
  upcomingCount,
  draftEventsCount,
  boardCount,
  noteCount,
  whiteboardCount,
  pageCount,
  actionCount,
  overdueTasksCount,
  todayEventsCount,
  upcomingEvents,
  recentActivities,
  recentItems,
  boardsWithColumns,
}: WorkspaceDashboardProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [showIssuePill, setShowIssuePill] = useState(true);

  // Form State
  const [taskTitle, setTaskTitle] = useState("");
  const [selectedBoardId, setSelectedBoardId] = useState(boardsWithColumns[0]?.id ?? "");
  const [selectedColumnId, setSelectedColumnId] = useState(
    boardsWithColumns[0]?.columns[0]?.id ?? ""
  );
  const [priority, setPriority] = useState<"LOW" | "MEDIUM" | "HIGH">("MEDIUM");
  const [dueDate, setDueDate] = useState("");

  const currentBoard = boardsWithColumns.find((b) => b.id === selectedBoardId);

  function handleBoardChange(boardId: string) {
    setSelectedBoardId(boardId);
    const board = boardsWithColumns.find((b) => b.id === boardId);
    if (board && board.columns.length > 0) {
      setSelectedColumnId(board.columns[0].id);
    } else {
      setSelectedColumnId("");
    }
  }

  function handleCreateTask() {
    if (!taskTitle.trim()) {
      toast.error("Task title is required");
      return;
    }
    if (!selectedColumnId) {
      toast.error("A target column is required. Please create a board first.");
      return;
    }

    startTransition(async () => {
      const createRes = await createTask(selectedColumnId, taskTitle.trim());
      if (!createRes.success) {
        toast.error(createRes.error);
        return;
      }

      const taskId = createRes.data.id;

      // Update task priority and due date if specified
      if (priority !== "MEDIUM" || dueDate) {
        const updateRes = await updateTask(taskId, {
          priority,
          dueDate: dueDate ? new Date(dueDate) : null,
        });
        if (!updateRes.success) {
          toast.error(updateRes.error);
        }
      }

      toast.success("Task created successfully!");
      setTaskTitle("");
      setDueDate("");
      setPriority("MEDIUM");
      setIsCreateOpen(false);
      router.refresh();
    });
  }

  // Calculate most active module
  const modules = [
    { name: "Calendar", count: upcomingCount },
    { name: "Kanban / Tasks", count: totalTasks },
    { name: "Notes", count: noteCount },
    { name: "Whiteboard", count: whiteboardCount },
    { name: "AI Assistant", count: actionCount },
  ];
  modules.sort((a, b) => b.count - a.count);
  const mostActiveModule = modules[0]?.name ?? "Calendar";

  // Compute suggested focus
  let focusRecommendation = "Suggested focus: finish overdue work before adding new tasks.";
  if (overdueTasksCount === 0) {
    if (totalTasks - completedTasks > 5) {
      focusRecommendation = "Suggested focus: high volume of active tasks, consider scheduling them.";
    } else {
      focusRecommendation = "Suggested focus: sprint looks clear, check calendar for upcoming events.";
    }
  }

  // Modules List
  const quickLinks = [
    {
      label: "Calendar",
      href: "calendar",
      icon: CalendarDays,
      primaryMetric: `${upcomingCount} upcoming items`,
      secondaryMetric: `${draftEventsCount} drafts saved`,
    },
    {
      label: "Kanban / Tasks",
      href: "kanban",
      icon: Columns3,
      primaryMetric: `${totalTasks} task${totalTasks === 1 ? "" : "s"}`,
      secondaryMetric: `${completedTasks} completed`,
    },
    {
      label: "Notes",
      href: "notes",
      icon: FileText,
      primaryMetric: `${noteCount} note${noteCount === 1 ? "" : "s"}`,
      secondaryMetric: "0 pinned notes ready",
    },
    {
      label: "Whiteboard",
      href: "whiteboard",
      icon: PenTool,
      primaryMetric: `${whiteboardCount} board${whiteboardCount === 1 ? "" : "s"}`,
      secondaryMetric: "Visual workspace",
    },
    {
      label: "AI Assistant",
      href: "ai-assistant",
      icon: Sparkles,
      primaryMetric: `${actionCount} action${actionCount === 1 ? "" : "s"}`,
      secondaryMetric: "Today",
    },
    {
      label: "AI Template Builder",
      href: "template-builder",
      icon: Wand2,
      primaryMetric: "1 template",
      secondaryMetric: "0 sidebar apps pinned",
    },
  ];

  return (
    <div className="min-h-screen bg-[#FBF9F6] text-neutral-800 dark:bg-[#0C0C0D] dark:text-neutral-200 p-4 sm:p-6 space-y-6">
      
      {/* Issues / Overdue Tasks Banner */}
      {showIssuePill && overdueTasksCount > 0 && (
        <div className="flex justify-end">
          <div className="bg-[#E11D48] text-white text-xs font-semibold px-4 py-2 rounded-full flex items-center gap-2 shadow-md animate-fade-in">
            <AlertCircle className="size-3.5" />
            <span>{overdueTasksCount} Overdue Task{overdueTasksCount > 1 ? "s" : ""}</span>
            <button
              onClick={() => setShowIssuePill(false)}
              className="hover:bg-white/20 p-0.5 rounded-full transition-colors ml-1"
            >
              <X className="size-3" />
            </button>
          </div>
        </div>
      )}

      {/* Welcome Banner Card */}
      <section className="overflow-hidden rounded-[2rem] border border-neutral-200/50 bg-gradient-to-r from-[#E5F5F0] via-[#FAF6ED] to-[#FCEAE8] p-6 sm:p-8 shadow-xs dark:from-[#0E1B17] dark:via-[#161410] dark:to-[#1C0F0E] dark:border-neutral-800/80">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-1.5 rounded-full border border-neutral-300/40 bg-white/70 px-3.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-[#E55737] dark:bg-neutral-900/60 dark:border-neutral-800">
              <Sparkles className="size-3.5" />
              Dashboard
            </div>
            <div className="space-y-2">
              <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
                Welcome back, {userName}.
              </h1>
              <p className="max-w-2xl text-sm leading-relaxed text-neutral-500 dark:text-neutral-400">
                Your workspace is awake: tasks, calendar, pages, and AI work are gathered here for a clear start.
              </p>
            </div>
            <div className="flex flex-wrap gap-3 pt-1">
              <Button
                onClick={() => setIsCreateOpen(true)}
                className="rounded-full px-5 py-2 bg-[#E55737] hover:bg-[#D44626] text-white border-0 font-medium shadow-xs transition-all"
              >
                <Plus className="mr-2 size-4" />
                New task
              </Button>
              <Button
                asChild
                variant="outline"
                className="rounded-full px-5 py-2 bg-white/80 hover:bg-neutral-100/90 text-neutral-700 border-neutral-300/60 dark:bg-neutral-900/80 dark:border-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-800/90"
              >
                <Link href={`/dashboard/${workspaceId}/calendar`}>
                  <CalendarIcon className="mr-2 size-4" />
                  Calendar
                </Link>
              </Button>
            </div>
          </div>

          {/* Metric Badges */}
          <div className="grid grid-cols-3 gap-3 w-full lg:w-auto lg:min-w-[28rem]">
            {[
              { label: "Tasks", value: String(totalTasks) },
              { label: "Complete", value: `${completePercentage}%` },
              { label: "Upcoming", value: String(upcomingCount) },
            ].map((item) => (
              <div
                key={item.label}
                className="rounded-2xl border border-white/60 bg-white/70 p-4 text-center shadow-xs backdrop-blur-md dark:bg-neutral-950/60 dark:border-neutral-800/80"
              >
                <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-400 dark:text-neutral-500">
                  {item.label}
                </p>
                <p className="mt-2 text-3xl font-semibold tracking-tight">{item.value}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Module Overview Cards Grid */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {quickLinks.map((item) => {
          const Icon = item.icon;
          return (
            <Link key={item.label} href={`/dashboard/${workspaceId}/${item.href}`}>
              <Card className="group h-full border-neutral-200/50 bg-white/60 backdrop-blur-xs transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md dark:border-neutral-800/80 dark:bg-[#121214]/60">
                <CardHeader className="flex flex-col gap-2 space-y-0 p-4">
                  <div className="flex items-center justify-between w-full">
                    <div className="rounded-xl border border-neutral-200/40 bg-neutral-100/50 p-2.5 transition-colors group-hover:bg-[#E55737]/10 group-hover:text-[#E55737] dark:border-neutral-800/50 dark:bg-neutral-900/50">
                      <Icon className="size-4.5" />
                    </div>
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[9px] font-bold tracking-wide text-emerald-600 dark:bg-emerald-950/20 dark:text-emerald-500 border border-emerald-200/20">
                      <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      Active
                    </span>
                  </div>
                  <div className="pt-2">
                    <CardTitle className="text-sm font-semibold tracking-tight text-neutral-800 dark:text-neutral-200">
                      {item.label}
                    </CardTitle>
                    <p className="text-xs font-semibold text-neutral-600 dark:text-neutral-300 mt-1">
                      {item.primaryMetric}
                    </p>
                    <p className="text-[10px] text-neutral-400 dark:text-neutral-500 mt-0.5">
                      {item.secondaryMetric}
                    </p>
                  </div>
                </CardHeader>
              </Card>
            </Link>
          );
        })}
      </section>

      {/* Row 1: Upcoming Calendar & Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Upcoming Calendar Widget */}
        <Card className="lg:col-span-7 border-neutral-200/50 bg-white/60 dark:border-neutral-800/80 dark:bg-[#121214]/60">
          <CardHeader className="flex flex-row items-center gap-2 pb-2">
            <div className="bg-[#E55737]/10 p-1.5 rounded-lg text-[#E55737]">
              <CalendarIcon className="size-4.5" />
            </div>
            <CardTitle className="text-base font-semibold">Upcoming calendar</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 pt-2">
            {upcomingEvents.length === 0 ? (
              <div className="text-center py-8 text-sm text-neutral-400">
                No upcoming calendar events
              </div>
            ) : (
              upcomingEvents.map((event) => (
                <div
                  key={event.id}
                  className="flex items-center justify-between rounded-xl border border-neutral-200/40 bg-white/90 px-4 py-3.5 text-sm shadow-2xs dark:border-neutral-800/40 dark:bg-neutral-900/60"
                >
                  <div className="flex items-center gap-3">
                    <span className="size-2.5 rounded-full bg-emerald-500" />
                    <div>
                      <p className="font-semibold text-neutral-800 dark:text-neutral-200">{event.title}</p>
                      <p className="text-xs text-neutral-400 mt-0.5">
                        {formatEventDate(event.date)}
                      </p>
                    </div>
                  </div>
                  <Badge variant="secondary" className="text-[10px] font-bold uppercase tracking-wider bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400">
                    Task
                  </Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Recent Activity Widget */}
        <Card className="lg:col-span-5 border-neutral-200/50 bg-white/60 dark:border-neutral-800/80 dark:bg-[#121214]/60">
          <CardHeader className="flex flex-row items-center gap-2 pb-2">
            <div className="bg-[#E55737]/10 p-1.5 rounded-lg text-[#E55737]">
              <Clock className="size-4.5" />
            </div>
            <CardTitle className="text-base font-semibold">Recent activity</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 pt-2">
            {recentActivities.length === 0 ? (
              <div className="text-center py-8 text-sm text-neutral-400">
                No recent activity in this workspace
              </div>
            ) : (
              recentActivities.map((act) => {
                let dotColor = "bg-blue-500";
                if (act.type === "task") dotColor = "bg-amber-500";
                if (act.type === "calendar") dotColor = "bg-emerald-500";
                if (act.type === "whiteboard") dotColor = "bg-rose-500";
                if (act.type === "page") dotColor = "bg-purple-500";

                return (
                  <div key={act.id} className="flex items-start gap-3 text-xs leading-normal">
                    <span className={`size-2.5 rounded-full mt-1 shrink-0 ${dotColor}`} />
                    <div className="flex-1">
                      <p className="font-semibold text-neutral-800 dark:text-neutral-200">
                        {act.title}
                      </p>
                      <p className="text-neutral-400 mt-0.5">
                        {act.description} • {formatActivityDate(act.time)}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>
      </div>

      {/* Row 2: Recent Pages & AI Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Recent Pages / Workspaces Grid */}
        <div className="lg:col-span-7 space-y-3">
          <div className="flex items-center gap-2">
            <div className="bg-[#E55737]/10 p-1.5 rounded-lg text-[#E55737]">
              <FileText className="size-4.5" />
            </div>
            <h2 className="text-base font-semibold">Recent pages</h2>
          </div>
          
          {recentItems.length === 0 ? (
            <Card className="border-neutral-200/50 bg-white/60 p-8 text-center text-sm text-neutral-400 dark:border-neutral-800/80 dark:bg-[#121214]/60">
              No recent pages or boards
            </Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {recentItems.map((item) => {
                let bgStyle = "bg-amber-50/50 border-amber-200/40 text-amber-900 dark:bg-amber-950/10 dark:border-amber-900/20";
                let typeLabel = "Kanban board";
                let href = `kanban/${item.id}`;

                if (item.type === "whiteboard") {
                  bgStyle = "bg-rose-50/50 border-rose-200/40 text-rose-900 dark:bg-rose-950/10 dark:border-rose-900/20";
                  typeLabel = "Whiteboard";
                  href = `whiteboard/${item.id}`;
                } else if (item.type === "note") {
                  bgStyle = "bg-blue-50/50 border-blue-200/40 text-blue-900 dark:bg-blue-950/10 dark:border-blue-900/20";
                  typeLabel = "Note";
                  href = `notes?id=${item.id}`;
                } else if (item.type === "page") {
                  bgStyle = "bg-purple-50/50 border-purple-200/40 text-purple-900 dark:bg-purple-950/10 dark:border-purple-900/20";
                  typeLabel = "Page";
                  href = `pages?id=${item.id}`;
                }

                return (
                  <Link key={item.id} href={`/dashboard/${workspaceId}/${href}`}>
                    <div className={`p-4 rounded-2xl border transition-all hover:shadow-md h-full flex flex-col justify-between gap-3 ${bgStyle}`}>
                      <div>
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold uppercase tracking-wider opacity-65">
                            {typeLabel}
                          </span>
                        </div>
                        <h4 className="font-semibold text-sm tracking-tight mt-1 opacity-90 truncate">
                          {item.title}
                        </h4>
                      </div>
                      <div>
                        <p className="text-xs opacity-75 font-semibold">{item.secondaryInfo}</p>
                        <p className="text-[10px] opacity-55 mt-0.5">
                          Updated {formatActivityDate(item.updatedAt)}
                        </p>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        {/* AI Insights Panel */}
        <Card className="lg:col-span-5 border-neutral-200/50 bg-gradient-to-br from-[#FAF5FF] to-[#EEF2FF] dark:from-[#170E28] dark:to-[#0F132C] dark:border-neutral-800/80 shadow-xs">
          <CardHeader className="flex flex-row items-center gap-2 pb-2">
            <div className="bg-violet-600/10 p-1.5 rounded-lg text-violet-600 dark:text-violet-400">
              <Sparkles className="size-4.5" />
            </div>
            <CardTitle className="text-base font-semibold">AI insights</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 pt-2">
            {[
              `You have ${overdueTasksCount} overdue task${overdueTasksCount === 1 ? "" : "s"}.`,
              `Your most active module is ${mostActiveModule}.`,
              `You completed ${completePercentage}% of tracked tasks.`,
              todayEventsCount === 0 ? "No events scheduled for today." : `${todayEventsCount} event${todayEventsCount === 1 ? "" : "s"} scheduled for today.`,
              focusRecommendation,
            ].map((insight, idx) => (
              <div key={idx} className="flex items-start gap-4 text-xs font-medium leading-relaxed">
                <span className="size-5 rounded-full bg-violet-600/10 text-violet-600 dark:bg-violet-950/40 dark:text-violet-400 flex items-center justify-center font-bold text-[10px] shrink-0">
                  {idx + 1}
                </span>
                <p className="text-neutral-700 dark:text-neutral-300 pt-0.5">{insight}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Fully Interactive Task Creation Modal */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="sm:max-w-md bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold tracking-tight">Create task</DialogTitle>
          </DialogHeader>

          {boardsWithColumns.length === 0 ? (
            <div className="py-4 text-center text-sm text-neutral-500">
              Please create a Kanban Board first to host your columns and tasks!
            </div>
          ) : (
            <div className="space-y-4 py-2">
              {/* Task Title */}
              <div className="grid gap-1.5">
                <Label htmlFor="task-name">Title</Label>
                <Input
                  id="task-name"
                  placeholder="Task title…"
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                />
              </div>

              {/* Board Selection */}
              <div className="grid gap-1.5">
                <Label>Board</Label>
                <Select value={selectedBoardId} onValueChange={handleBoardChange}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select board" />
                  </SelectTrigger>
                  <SelectContent>
                    {boardsWithColumns.map((b) => (
                      <SelectItem key={b.id} value={b.id}>
                        {b.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Column Selection */}
              <div className="grid gap-1.5">
                <Label>Column</Label>
                <Select value={selectedColumnId} onValueChange={setSelectedColumnId}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select column" />
                  </SelectTrigger>
                  <SelectContent>
                    {currentBoard?.columns.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Priority & Due Date */}
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-1.5">
                  <Label>Priority</Label>
                  <Select
                    value={priority}
                    onValueChange={(v) => setPriority(v as "LOW" | "MEDIUM" | "HIGH")}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select priority" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="LOW">Low</SelectItem>
                      <SelectItem value="MEDIUM">Medium</SelectItem>
                      <SelectItem value="HIGH">High</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-1.5">
                  <Label htmlFor="task-due-date">Due date</Label>
                  <Input
                    id="task-due-date"
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-3 pt-3">
                <Button
                  variant="outline"
                  onClick={() => setIsCreateOpen(false)}
                  disabled={isPending}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleCreateTask}
                  disabled={isPending}
                  className="bg-[#E55737] hover:bg-[#D44626] text-white border-0"
                >
                  {isPending ? "Creating…" : "Create"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
