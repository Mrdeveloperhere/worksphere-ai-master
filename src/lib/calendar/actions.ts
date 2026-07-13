"use server";

import { revalidatePath } from "next/cache";

import { ok, fail, type ActionResult } from "@/lib/action-result";
import { tryWorkspaceAccess } from "@/lib/auth/workspace-access";
import { prisma } from "@/lib/prisma";
import {
  getEventOwnership,
  serializeEvent,
  type CalendarEventDTO,
} from "@/lib/calendar/helpers";
import type { EventCategory } from "@/lib/calendar/constants";

// Calendar events are personal in v1 (per design doc) — workspace
// membership is required to use the calendar at all, but a member can only
// read/edit their own events, never a teammate's.
async function tryEventAccess(eventId: string) {
  const event = await prisma.calendarEvent.findUniqueOrThrow({
    where: { id: eventId },
  });
  const access = await tryWorkspaceAccess(event.workspaceId);
  if (!access.ok) return { ok: false as const, error: access.error };
  if (access.userId !== event.userId && access.userId !== event.assigneeId) {
    return { ok: false as const, error: "You can only manage calendar events where you are the creator or assignee" };
  }
  return { ok: true as const, workspaceId: event.workspaceId, userId: access.userId };
}

export async function createDraftTask(
  workspaceId: string,
  title: string,
): Promise<ActionResult<CalendarEventDTO>> {
  if (!title.trim()) return fail("Title is required");

  const access = await tryWorkspaceAccess(workspaceId);
  if (!access.ok) return fail(access.error);

  const event = await prisma.calendarEvent.create({
    data: { workspaceId, userId: access.userId, title: title.trim(), isDraft: true },
  });

  revalidatePath(`/dashboard/${workspaceId}/calendar`);
  return ok(serializeEvent(event));
}

// Direct create+schedule in one step — used by the AI Scheduling Agent,
// where the user already said when the event should happen ("schedule a
// call tomorrow at 3pm"), so there's no reason to land it in the draft
// panel first like the manual drag-and-drop flow does.
export async function createScheduledEvent(
  workspaceId: string,
  title: string,
  date: Date,
  startTime: Date,
  endTime: Date,
  category: EventCategory = "PERSONAL",
  description?: string,
): Promise<ActionResult<CalendarEventDTO>> {
  if (!title.trim()) return fail("Title is required");

  const access = await tryWorkspaceAccess(workspaceId);
  if (!access.ok) return fail(access.error);

  const duration = Math.round((endTime.getTime() - startTime.getTime()) / 60000);

  const event = await prisma.calendarEvent.create({
    data: {
      workspaceId,
      userId: access.userId,
      title: title.trim(),
      description,
      date,
      startTime,
      endTime,
      duration,
      category,
      isDraft: false,
    },
  });

  revalidatePath(`/dashboard/${workspaceId}/calendar`);
  return ok(serializeEvent(event));
}

export async function getEventsForRange(
  workspaceId: string,
  rangeStart: Date,
  rangeEnd: Date,
): Promise<ActionResult<CalendarEventDTO[]>> {
  const access = await tryWorkspaceAccess(workspaceId);
  if (!access.ok) return fail(access.error);

  const events = await prisma.calendarEvent.findMany({
    where: {
      workspaceId,
      isDraft: false,
      date: { gte: rangeStart, lte: rangeEnd },
      OR: [
        { userId: access.userId },
        { assigneeId: access.userId }
      ]
    },
    orderBy: { startTime: "asc" },
  });

  return ok(events.map(serializeEvent));
}

type UpdateTaskInput = {
  title?: string;
  description?: string | null;
  priority?: "LOW" | "MEDIUM" | "HIGH";
  category?: EventCategory;
  duration?: number | null;
  assigneeId?: string | null;
};

export async function updateTask(
  eventId: string,
  data: UpdateTaskInput,
): Promise<ActionResult<void>> {
  if (data.title !== undefined && !data.title.trim()) return fail("Title is required");

  const access = await tryEventAccess(eventId);
  if (!access.ok) return fail(access.error);

  if (data.assigneeId) {
    const assigneeIsMember = await prisma.workspaceMember.findFirst({
      where: { workspaceId: access.workspaceId, userId: data.assigneeId, status: "ACTIVE" },
    });
    if (!assigneeIsMember) return fail("Assignee must be a member of this workspace");
  }

  await prisma.calendarEvent.update({
    where: { id: eventId },
    data: { ...data, title: data.title?.trim() },
  });

  revalidatePath(`/dashboard/${access.workspaceId}/calendar`);
  return ok(undefined);
}

// Used both for the initial drag-from-draft-panel placement and for
// dragging an already-scheduled event to a new day/time — both are "set
// these scheduling fields and make sure isDraft is false."
export async function scheduleTask(
  eventId: string,
  date: Date,
  startTime: Date,
  endTime: Date,
): Promise<ActionResult<void>> {
  const access = await tryEventAccess(eventId);
  if (!access.ok) return fail(access.error);

  const duration = Math.round((endTime.getTime() - startTime.getTime()) / 60000);

  await prisma.calendarEvent.update({
    where: { id: eventId },
    data: { date, startTime, endTime, duration, isDraft: false },
  });

  revalidatePath(`/dashboard/${access.workspaceId}/calendar`);
  return ok(undefined);
}

export async function moveToDraft(eventId: string): Promise<ActionResult<void>> {
  const access = await tryEventAccess(eventId);
  if (!access.ok) return fail(access.error);

  await prisma.calendarEvent.update({
    where: { id: eventId },
    data: { date: null, startTime: null, endTime: null, isDraft: true },
  });

  revalidatePath(`/dashboard/${access.workspaceId}/calendar`);
  return ok(undefined);
}

export async function deleteTask(eventId: string): Promise<ActionResult<void>> {
  const access = await tryEventAccess(eventId);
  if (!access.ok) return fail(access.error);

  await prisma.calendarEvent.delete({ where: { id: eventId } });

  revalidatePath(`/dashboard/${access.workspaceId}/calendar`);
  return ok(undefined);
}
