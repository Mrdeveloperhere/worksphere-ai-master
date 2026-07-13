"use client";

import { WeekView } from "@/components/calendar/week-view";
import type { CalendarEventDTO } from "@/lib/stores/calendar-store";

export function DayView({
  day,
  events,
  onEventClick,
}: {
  day: Date;
  events: CalendarEventDTO[];
  onEventClick: (id: string) => void;
}) {
  return <WeekView days={[day]} events={events} onEventClick={onEventClick} />;
}
