"use client";

import { useEffect, useState } from "react";
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { toast } from "sonner";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { DraftPanel } from "@/components/calendar/draft-panel";
import { MonthView } from "@/components/calendar/month-view";
import { WeekView } from "@/components/calendar/week-view";
import { DayView } from "@/components/calendar/day-view";
import { EventDetailDialog } from "@/components/calendar/event-detail-dialog";
import { scheduleTask, getEventsForRange } from "@/lib/calendar/actions";
import { useCalendarStore, type CalendarEventDTO } from "@/lib/stores/calendar-store";
import {
  addDays,
  monthGridDays,
  startOfDay,
  startOfMonth,
  startOfWeek,
} from "@/lib/calendar/date-utils";

type ViewMode = "month" | "week" | "day";

function rangeFor(viewMode: ViewMode, anchor: Date): [Date, Date] {
  if (viewMode === "month") {
    const days = monthGridDays(anchor);
    return [days[0], days[days.length - 1]];
  }
  if (viewMode === "week") {
    const start = startOfWeek(anchor);
    return [start, addDays(start, 6)];
  }
  const day = startOfDay(anchor);
  return [day, day];
}

function headerLabel(viewMode: ViewMode, anchor: Date): string {
  if (viewMode === "month") {
    return anchor.toLocaleDateString(undefined, { month: "long", year: "numeric" });
  }
  if (viewMode === "week") {
    const [start, end] = rangeFor("week", anchor);
    return `${start.toLocaleDateString(undefined, { month: "short", day: "numeric" })} – ${end.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}`;
  }
  return anchor.toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export function CalendarView({
  workspaceId,
  initialEvents,
  assigneeOptions,
}: {
  workspaceId: string;
  initialEvents: CalendarEventDTO[];
  assigneeOptions: { id: string; name: string }[];
}) {
  const events = useCalendarStore((s) => s.events);
  const setEvents = useCalendarStore((s) => s.setEvents);
  const mergeRangeEvents = useCalendarStore((s) => s.mergeRangeEvents);
  const scheduleLocal = useCalendarStore((s) => s.scheduleLocal);

  const [viewMode, setViewMode] = useState<ViewMode>("month");
  const [anchor, setAnchor] = useState(() => new Date());
  const [activeEventId, setActiveEventId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
  );

  useEffect(() => {
    setEvents(initialEvents);
    // Hydrate once on mount; subsequent range changes are fetched explicitly
    // below, not re-triggered by this effect.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const [rangeStart, rangeEnd] = rangeFor(viewMode, anchor);
    getEventsForRange(workspaceId, rangeStart, rangeEnd).then((result) => {
      if (result.success) mergeRangeEvents(result.data);
    });
    // Re-fetch whenever the visible range changes (view mode or navigation).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewMode, anchor.getTime()]);

  function navigate(direction: -1 | 1) {
    if (viewMode === "month") {
      setAnchor(new Date(anchor.getFullYear(), anchor.getMonth() + direction, 1));
    } else if (viewMode === "week") {
      setAnchor(addDays(anchor, direction * 7));
    } else {
      setAnchor(addDays(anchor, direction));
    }
  }

  async function handleDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (!over) return;

    const eventId = String(active.id);
    const event = events.find((ev) => ev.id === eventId);
    if (!event) return;

    const overData = over.data.current as
      | { type: "day"; date: string }
      | { type: "slot"; date: string; hour: number }
      | undefined;
    if (!overData) return;

    const durationMinutes = event.duration ?? 60;
    let startTime: Date;

    if (overData.type === "slot") {
      startTime = new Date(`${overData.date}T${String(overData.hour).padStart(2, "0")}:00:00`);
    } else {
      const existing = event.startTime ? new Date(event.startTime) : null;
      const hour = existing ? existing.getHours() : 9;
      const minute = existing ? existing.getMinutes() : 0;
      startTime = new Date(
        `${overData.date}T${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:00`,
      );
    }

    const endTime = new Date(startTime.getTime() + durationMinutes * 60000);
    const dateOnly = new Date(`${overData.date}T00:00:00`);

    const snapshot = events;
    scheduleLocal(eventId, dateOnly.toISOString(), startTime.toISOString(), endTime.toISOString());

    const result = await scheduleTask(eventId, dateOnly, startTime, endTime);
    if (!result.success) {
      setEvents(snapshot);
      toast.error(result.error);
    }
  }

  const drafts = events.filter((e) => e.isDraft);
  const activeEvent = activeEventId ? events.find((e) => e.id === activeEventId) ?? null : null;

  return (
    <div className="flex h-full flex-col gap-4 p-4 sm:p-6">
      <section className="rounded-[1.75rem] border border-border/70 bg-linear-to-br from-emerald-50 via-amber-50 to-sky-50 p-5 shadow-sm dark:from-neutral-900 dark:via-neutral-900 dark:to-neutral-800">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">Calendar</p>
            <h1 className="text-3xl font-semibold tracking-tight">Create the week, then drag work into place.</h1>
            <p className="max-w-3xl text-sm leading-6 text-muted-foreground sm:text-base">
              Keep unscheduled drafts nearby, then move them into the grid once the plan feels stable.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 rounded-full border border-border/70 bg-background/80 p-1 shadow-sm backdrop-blur">
            <Button variant="outline" size="icon" className="size-8 rounded-full" onClick={() => navigate(-1)}>
              <ChevronLeft className="size-4" />
            </Button>
            <Button variant="outline" size="sm" className="rounded-full" onClick={() => setAnchor(new Date())}>
              Today
            </Button>
            <Button variant="outline" size="icon" className="size-8 rounded-full" onClick={() => navigate(1)}>
              <ChevronRight className="size-4" />
            </Button>
            <div className="mx-1 h-5 w-px bg-border" />
            <div className="flex gap-1 rounded-full bg-muted/50 p-1">
              {(["month", "week", "day"] as const).map((mode) => (
                <Button
                  key={mode}
                  size="sm"
                  variant={viewMode === mode ? "default" : "ghost"}
                  className="h-8 rounded-full capitalize"
                  onClick={() => setViewMode(mode)}
                >
                  {mode}
                </Button>
              ))}
            </div>
          </div>
        </div>
      </section>

      <div className="flex min-h-0 flex-1 overflow-hidden rounded-[1.75rem] border border-border/70 bg-background/80 shadow-lg">
        <DndContext sensors={sensors} onDragEnd={(e) => void handleDragEnd(e)}>
          <div className="flex min-h-0 flex-1 overflow-hidden">
            <DraftPanel
              workspaceId={workspaceId}
              drafts={drafts}
              onEventClick={(id) => setActiveEventId(id)}
            />

            {viewMode === "month" && (
              <MonthView
                monthAnchor={startOfMonth(anchor)}
                days={monthGridDays(anchor)}
                events={events}
                onEventClick={(id) => setActiveEventId(id)}
              />
            )}
            {viewMode === "week" && (
              <WeekView
                days={Array.from({ length: 7 }, (_, i) => addDays(startOfWeek(anchor), i))}
                events={events}
                onEventClick={(id) => setActiveEventId(id)}
              />
            )}
            {viewMode === "day" && (
              <DayView day={anchor} events={events} onEventClick={(id) => setActiveEventId(id)} />
            )}
          </div>
        </DndContext>

        <EventDetailDialog
          event={activeEvent}
          assigneeOptions={assigneeOptions}
          onClose={() => setActiveEventId(null)}
        />
      </div>
    </div>
  );
}
