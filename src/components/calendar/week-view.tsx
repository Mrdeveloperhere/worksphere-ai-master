"use client";

import { useDroppable } from "@dnd-kit/core";

import { cn } from "@/lib/utils";
import { EventCard } from "@/components/calendar/event-card";
import { dateKey, isSameDay } from "@/lib/calendar/date-utils";
import type { CalendarEventDTO } from "@/lib/stores/calendar-store";

// 7am-9pm covers the working day without an all-day scroll area — v1 has
// no all-day/overnight event support, so this range is sufficient.
const HOURS = Array.from({ length: 15 }, (_, i) => i + 7);

function HourCell({
  day,
  hour,
  events,
  onEventClick,
}: {
  day: Date;
  hour: number;
  events: CalendarEventDTO[];
  onEventClick: (id: string) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: `slot:${dateKey(day)}:${hour}`,
    data: { type: "slot", date: dateKey(day), hour },
  });

  const hourEvents = events.filter(
    (e) =>
      e.date &&
      dateKey(new Date(e.date)) === dateKey(day) &&
      e.startTime &&
      new Date(e.startTime).getHours() === hour,
  );

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex min-h-12 flex-col gap-0.5 border-b border-r p-0.5",
        isOver && "bg-accent",
      )}
    >
      {hourEvents.map((event) => (
        <EventCard key={event.id} event={event} compact onClick={() => onEventClick(event.id)} />
      ))}
    </div>
  );
}

export function WeekView({
  days,
  events,
  onEventClick,
}: {
  days: Date[];
  events: CalendarEventDTO[];
  onEventClick: (id: string) => void;
}) {
  return (
    <div className="flex flex-1 flex-col overflow-y-auto">
      <div
        className="grid border-l border-t text-center text-xs font-medium"
        style={{ gridTemplateColumns: `3.5rem repeat(${days.length}, 1fr)` }}
      >
        <div className="border-b border-r" />
        {days.map((day) => (
          <div
            key={dateKey(day)}
            className={cn(
              "border-b border-r py-1",
              isSameDay(day, new Date()) && "bg-accent",
            )}
          >
            <div className="text-muted-foreground">
              {day.toLocaleDateString(undefined, { weekday: "short" })}
            </div>
            <div className="font-semibold">{day.getDate()}</div>
          </div>
        ))}
      </div>

      {HOURS.map((hour) => (
        <div
          key={hour}
          className="grid border-l"
          style={{ gridTemplateColumns: `3.5rem repeat(${days.length}, 1fr)` }}
        >
          <div className="border-b border-r px-1 py-1 text-right text-[11px] text-muted-foreground">
            {hour % 12 === 0 ? 12 : hour % 12}
            {hour < 12 ? "am" : "pm"}
          </div>
          {days.map((day) => (
            <HourCell
              key={dateKey(day)}
              day={day}
              hour={hour}
              events={events}
              onEventClick={onEventClick}
            />
          ))}
        </div>
      ))}
    </div>
  );
}
