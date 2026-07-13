import { create } from "zustand";

import type { CalendarEventDTO } from "@/lib/calendar/helpers";

export type { CalendarEventDTO };

type CalendarState = {
  events: CalendarEventDTO[];
  setEvents: (events: CalendarEventDTO[]) => void;
  mergeRangeEvents: (rangeEvents: CalendarEventDTO[]) => void;
  scheduleLocal: (id: string, date: string, startTime: string, endTime: string) => void;
  moveToDraftLocal: (id: string) => void;
  upsertLocal: (event: CalendarEventDTO) => void;
  patchLocal: (id: string, patch: Partial<CalendarEventDTO>) => void;
  removeLocal: (id: string) => void;
};

// Holds every CalendarEvent currently known to the client — drafts (no
// date) plus whatever scheduled range has been fetched so far. Drag
// handlers mutate this immediately; on a failed server action the caller
// restores the pre-drag snapshot via setEvents() (rollback), mirroring the
// Kanban store's optimistic-update pattern.
export const useCalendarStore = create<CalendarState>((set, get) => ({
  events: [],
  setEvents: (events) => set({ events }),
  // Replaces scheduled events within a newly-fetched range while keeping
  // drafts and any out-of-range scheduled events untouched — used when the
  // user navigates to a different month/week.
  mergeRangeEvents: (rangeEvents) => {
    const drafts = get().events.filter((e) => e.isDraft);
    const rangeIds = new Set(rangeEvents.map((e) => e.id));
    const keptScheduled = get().events.filter(
      (e) => !e.isDraft && !rangeIds.has(e.id),
    );
    set({ events: [...drafts, ...keptScheduled, ...rangeEvents] });
  },
  scheduleLocal: (id, date, startTime, endTime) => {
    const duration = Math.round(
      (new Date(endTime).getTime() - new Date(startTime).getTime()) / 60000,
    );
    set({
      events: get().events.map((e) =>
        e.id === id ? { ...e, date, startTime, endTime, duration, isDraft: false } : e,
      ),
    });
  },
  moveToDraftLocal: (id) => {
    set({
      events: get().events.map((e) =>
        e.id === id
          ? { ...e, date: null, startTime: null, endTime: null, isDraft: true }
          : e,
      ),
    });
  },
  upsertLocal: (event) => {
    const exists = get().events.some((e) => e.id === event.id);
    set({
      events: exists
        ? get().events.map((e) => (e.id === event.id ? event : e))
        : [...get().events, event],
    });
  },
  patchLocal: (id, patch) => {
    set({
      events: get().events.map((e) => (e.id === id ? { ...e, ...patch } : e)),
    });
  },
  removeLocal: (id) => set({ events: get().events.filter((e) => e.id !== id) }),
}));
