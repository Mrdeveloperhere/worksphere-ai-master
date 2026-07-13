"use client";

import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";

import { cn } from "@/lib/utils";
import { CATEGORY_COLORS } from "@/lib/calendar/constants";
import type { CalendarEventDTO } from "@/lib/stores/calendar-store";

export function EventCard({
  event,
  onClick,
  compact,
}: {
  event: CalendarEventDTO;
  onClick: () => void;
  compact?: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: event.id,
    data: { type: "event" },
  });

  const color = CATEGORY_COLORS[event.category];
  const time = event.startTime
    ? new Date(event.startTime).toLocaleTimeString(undefined, {
        hour: "numeric",
        minute: "2-digit",
      })
    : null;

  return (
    <button
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      onClick={onClick}
      style={{
        transform: CSS.Translate.toString(transform),
        borderLeftColor: color,
      }}
      className={cn(
        "w-full cursor-grab rounded-sm border-l-2 bg-card px-1.5 py-1 text-left text-xs shadow-sm transition-opacity hover:bg-accent",
        isDragging && "opacity-40",
        compact && "truncate",
      )}
    >
      {time && <span className="mr-1 text-muted-foreground">{time}</span>}
      <span className="font-medium">{event.title}</span>
    </button>
  );
}
