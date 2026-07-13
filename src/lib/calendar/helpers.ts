import "server-only";

import type { CalendarEvent } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import type { EventCategory } from "@/lib/calendar/constants";

export async function getEventOwnership(eventId: string) {
  const event = await prisma.calendarEvent.findUniqueOrThrow({
    where: { id: eventId },
  });
  return { workspaceId: event.workspaceId, ownerUserId: event.userId };
}

export type CalendarEventDTO = {
  id: string;
  title: string;
  description: string | null;
  date: string | null;
  startTime: string | null;
  endTime: string | null;
  duration: number | null;
  priority: "LOW" | "MEDIUM" | "HIGH";
  category: EventCategory;
  isDraft: boolean;
  assigneeId: string | null;
};

export function serializeEvent(event: CalendarEvent): CalendarEventDTO {
  return {
    id: event.id,
    title: event.title,
    description: event.description,
    date: event.date ? event.date.toISOString() : null,
    startTime: event.startTime ? event.startTime.toISOString() : null,
    endTime: event.endTime ? event.endTime.toISOString() : null,
    duration: event.duration,
    priority: event.priority,
    category: event.category,
    isDraft: event.isDraft,
    assigneeId: event.assigneeId,
  };
}
