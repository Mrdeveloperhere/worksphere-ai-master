import "server-only";

import { prisma } from "@/lib/prisma";
import { requireWorkspaceAccess } from "@/lib/auth/workspace-access";
import { serializeEvent } from "@/lib/calendar/helpers";

export async function getDraftTasks(workspaceId: string) {
  const { userId } = await requireWorkspaceAccess(workspaceId);
  const events = await prisma.calendarEvent.findMany({
    where: {
      workspaceId,
      isDraft: true,
      OR: [
        { userId },
        { assigneeId: userId }
      ]
    },
    orderBy: { createdAt: "desc" },
  });
  return events.map(serializeEvent);
}

export async function getScheduledEvents(
  workspaceId: string,
  rangeStart: Date,
  rangeEnd: Date,
) {
  const { userId } = await requireWorkspaceAccess(workspaceId);
  const events = await prisma.calendarEvent.findMany({
    where: {
      workspaceId,
      isDraft: false,
      date: { gte: rangeStart, lte: rangeEnd },
      OR: [
        { userId },
        { assigneeId: userId }
      ]
    },
    orderBy: { startTime: "asc" },
  });
  return events.map(serializeEvent);
}
