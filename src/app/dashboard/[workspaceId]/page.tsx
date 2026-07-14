import { notFound } from "next/navigation";
import { auth } from "@clerk/nextjs/server";

import { prisma } from "@/lib/prisma";
import { requireWorkspaceAccess } from "@/lib/auth/workspace-access";
import { WorkspaceDashboard } from "@/components/dashboard/workspace-dashboard";

function getProseMirrorTextLength(json: any): number {
  try {
    const data = typeof json === "string" ? JSON.parse(json) : json;
    let text = "";
    function traverse(node: any) {
      if (node.type === "text" && node.text) {
        text += node.text + " ";
      }
      if (node.content && Array.isArray(node.content)) {
        node.content.forEach(traverse);
      }
    }
    traverse(data);
    return text.trim() ? text.trim().split(/\s+/).length : 0;
  } catch {
    return 0;
  }
}

export default async function WorkspaceHomePage({
  params,
}: {
  params: Promise<{ workspaceId: string }>;
}) {
  const { workspaceId } = await params;
  await requireWorkspaceAccess(workspaceId);
  const { userId } = await auth();

  if (!userId) {
    notFound();
  }

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

  // Fetch all stats, lists, and boards with columns in parallel
  const [
    user,
    boards,
    totalTasks,
    completedTasks,
    upcomingEvents,
    upcomingCount,
    draftEventsCount,
    notes,
    pages,
    whiteboards,
    conversation,
    overdueTasksCount,
    todayEventsCount,
    recentTasks,
    recentEvents,
    recentNotes,
    recentWhiteboards,
    recentPages
  ] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId } }),
    prisma.board.findMany({
      where: { workspaceId },
      include: { columns: { orderBy: { position: "asc" } } },
      orderBy: { createdAt: "asc" }
    }),
    prisma.task.count({ where: { column: { board: { workspaceId } } } }),
    prisma.task.count({
      where: {
        column: {
          board: { workspaceId },
          name: { equals: "Done", mode: "insensitive" }
        }
      }
    }),
    prisma.calendarEvent.findMany({
      where: { workspaceId, isDraft: false, date: { gte: todayStart } },
      orderBy: { date: "asc" },
      take: 5
    }),
    prisma.calendarEvent.count({
      where: { workspaceId, isDraft: false, date: { gte: todayStart } }
    }),
    prisma.calendarEvent.count({ where: { workspaceId, isDraft: true } }),
    prisma.note.findMany({ where: { workspaceId }, orderBy: { updatedAt: "desc" } }),
    prisma.page.findMany({ where: { workspaceId }, orderBy: { updatedAt: "desc" } }),
    prisma.whiteboard.findMany({ where: { workspaceId }, orderBy: { updatedAt: "desc" } }),
    prisma.conversation.findFirst({
      where: { workspaceId, userId },
      orderBy: { updatedAt: "desc" },
      include: { _count: { select: { messages: true } } }
    }),
    prisma.task.count({
      where: {
        dueDate: { lt: now },
        column: {
          board: { workspaceId },
          name: { not: "Done" }
        }
      }
    }),
    prisma.calendarEvent.count({
      where: { workspaceId, isDraft: false, date: { gte: todayStart, lte: todayEnd } }
    }),
    prisma.task.findMany({
      where: { column: { board: { workspaceId } } },
      orderBy: { updatedAt: "desc" },
      take: 5
    }),
    prisma.calendarEvent.findMany({
      where: { workspaceId },
      orderBy: { updatedAt: "desc" },
      take: 5
    }),
    prisma.note.findMany({ where: { workspaceId }, orderBy: { updatedAt: "desc" }, take: 5 }),
    prisma.whiteboard.findMany({ where: { workspaceId }, orderBy: { updatedAt: "desc" }, take: 5 }),
    prisma.page.findMany({ where: { workspaceId }, orderBy: { updatedAt: "desc" }, take: 5 })
  ]);

  const userName = user?.name ?? user?.email.split("@")[0] ?? "User";
  const completePercentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
  const messageCount = conversation?._count.messages ?? 0;

  // Compute activities feed
  interface ActivityItem {
    id: string;
    title: string;
    description: string;
    time: string;
    type: "task" | "calendar" | "note" | "whiteboard" | "page";
  }

  const activities: ActivityItem[] = [
    ...recentTasks.map(t => ({
      id: t.id,
      title: t.title,
      description: t.createdAt.getTime() === t.updatedAt.getTime() ? "Created task" : "Updated task",
      time: t.updatedAt.toISOString(),
      type: "task" as const
    })),
    ...recentEvents.map(e => ({
      id: e.id,
      title: e.title,
      description: e.createdAt.getTime() === e.updatedAt.getTime() ? "Created calendar task" : "Updated calendar task",
      time: e.updatedAt.toISOString(),
      type: "calendar" as const
    })),
    ...recentNotes.map(n => ({
      id: n.id,
      title: n.title,
      description: "Updated note",
      time: n.updatedAt.toISOString(),
      type: "note" as const
    })),
    ...recentWhiteboards.map(w => ({
      id: w.id,
      title: w.title,
      description: "Updated whiteboard",
      time: w.updatedAt.toISOString(),
      type: "whiteboard" as const
    })),
    ...recentPages.map(p => ({
      id: p.id,
      title: p.title,
      description: "Updated page",
      time: p.updatedAt.toISOString(),
      type: "page" as const
    }))
  ];

  activities.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());
  const sortedActivities = activities.slice(0, 8);

  // Compute board task counts
  const boardTaskCountMap: Record<string, number> = {};
  for (const board of boards) {
    boardTaskCountMap[board.id] = await prisma.task.count({ where: { column: { boardId: board.id } } });
  }

  // Compute recent items grid
  interface RecentItem {
    id: string;
    title: string;
    type: "kanban" | "whiteboard" | "note" | "page";
    secondaryInfo: string;
    updatedAt: string;
  }

  const recentItems: RecentItem[] = [
    ...boards.map(b => ({
      id: b.id,
      title: b.name,
      type: "kanban" as const,
      secondaryInfo: `${boardTaskCountMap[b.id] ?? 0} task${boardTaskCountMap[b.id] === 1 ? "" : "s"}`,
      updatedAt: b.updatedAt.toISOString()
    })),
    ...whiteboards.map(w => ({
      id: w.id,
      title: w.title,
      type: "whiteboard" as const,
      secondaryInfo: "Visual workspace",
      updatedAt: w.updatedAt.toISOString()
    })),
    ...notes.map(n => {
      const words = n.content.trim() ? n.content.trim().split(/\s+/).length : 0;
      return {
        id: n.id,
        title: n.title,
        type: "note" as const,
        secondaryInfo: `${words} word${words === 1 ? "" : "s"}`,
        updatedAt: n.updatedAt.toISOString()
      };
    }),
    ...pages.map(p => {
      const words = getProseMirrorTextLength(p.content);
      return {
        id: p.id,
        title: p.title,
        type: "page" as const,
        secondaryInfo: `${words} word${words === 1 ? "" : "s"}`,
        updatedAt: p.updatedAt.toISOString()
      };
    })
  ];

  recentItems.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  const sortedRecentItems = recentItems.slice(0, 6);

  // Format upcoming calendar events
  const formattedUpcomingEvents = upcomingEvents.map(e => ({
    id: e.id,
    title: e.title,
    date: e.date ? e.date.toISOString() : "",
    category: e.category,
    isTask: false
  }));

  return (
    <WorkspaceDashboard
      workspaceId={workspaceId}
      userName={userName}
      totalTasks={totalTasks}
      completedTasks={completedTasks}
      completePercentage={completePercentage}
      upcomingCount={upcomingCount}
      draftEventsCount={draftEventsCount}
      boardCount={boards.length}
      noteCount={notes.length}
      whiteboardCount={whiteboards.length}
      pageCount={pages.length}
      actionCount={messageCount}
      overdueTasksCount={overdueTasksCount}
      todayEventsCount={todayEventsCount}
      upcomingEvents={formattedUpcomingEvents}
      recentActivities={sortedActivities}
      recentItems={sortedRecentItems}
      boardsWithColumns={boards.map(b => ({
        id: b.id,
        name: b.name,
        columns: b.columns.map(c => ({ id: c.id, name: c.name }))
      }))}
    />
  );
}
