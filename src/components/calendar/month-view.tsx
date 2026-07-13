"use client";

import { useDroppable } from "@dnd-kit/core";

import { cn } from "@/lib/utils";
import { EventCard } from "@/components/calendar/event-card";
import { dateKey, eventsOnDay, isSameDay, isSameMonth } from "@/lib/calendar/date-utils";
import type { CalendarEventDTO } from "@/lib/stores/calendar-store";

const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MAX_VISIBLE_PER_DAY = 3;

function DayCell({
  day,
  monthAnchor,
  events,
  onEventClick,
}: {
  day: Date;
  monthAnchor: Date;
  events: CalendarEventDTO[];
  onEventClick: (id: string) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: `day:${dateKey(day)}`,
    data: { type: "day", date: dateKey(day) },
  });

  const dayEvents = eventsOnDay(events, day);
  const visible = dayEvents.slice(0, MAX_VISIBLE_PER_DAY);
  const overflow = dayEvents.length - visible.length;

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex min-h-24 flex-col gap-1 border-b border-r p-1",
        !isSameMonth(day, monthAnchor) && "bg-muted/30 text-muted-foreground",
        isOver && "bg-accent",
      )}
    >
      <span
        className={cn(
          "text-xs",
          isSameDay(day, new Date()) &&
            "flex size-5 items-center justify-center rounded-full bg-primary font-medium text-primary-foreground",
        )}
      >
        {day.getDate()}
      </span>
      <div className="flex flex-col gap-0.5">
        {visible.map((event) => (
          <EventCard key={event.id} event={event} compact onClick={() => onEventClick(event.id)} />
        ))}
        {overflow > 0 && (
          <span className="text-[11px] text-muted-foreground">+{overflow} more</span>
        )}
      </div>
    </div>
  );
}

export function MonthView({
  monthAnchor,
  days,
  events,
  onEventClick,
}: {
  monthAnchor: Date;
  days: Date[];
  events: CalendarEventDTO[];
  onEventClick: (id: string) => void;
}) {
  return (
    <div className="flex flex-1 flex-col overflow-y-auto">
      <div className="grid grid-cols-7 border-l border-t text-center text-xs font-medium text-muted-foreground">
        {WEEKDAY_LABELS.map((label) => (
          <div key={label} className="border-b border-r py-1">
            {label}
          </div>
        ))}
      </div>
      <div className="grid flex-1 grid-cols-7 border-l">
        {days.map((day) => (
          <DayCell
            key={dateKey(day)}
            day={day}
            monthAnchor={monthAnchor}
            events={events}
            onEventClick={onEventClick}
          />
        ))}
      </div>
    </div>
  );
}
