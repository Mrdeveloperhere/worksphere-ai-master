import { describe, expect, it, beforeEach } from "vitest";

import { useCalendarStore, type CalendarEventDTO } from "@/lib/stores/calendar-store";

function makeDraft(): CalendarEventDTO {
  return {
    id: "event-1",
    title: "Plan sprint",
    description: null,
    date: null,
    startTime: null,
    endTime: null,
    duration: null,
    priority: "MEDIUM",
    category: "PERSONAL",
    isDraft: true,
  };
}

// Regression-critical: mirrors the Kanban store's optimistic-move pattern —
// scheduleLocal() applies the drag instantly, and a failed server action
// rolls back via setEvents(snapshot). Both the draft-panel-to-calendar drag
// and the reschedule-within-calendar drag depend on this behaving correctly.
describe("useCalendarStore", () => {
  beforeEach(() => {
    useCalendarStore.setState({ events: [] });
  });

  it("schedules a draft task, clearing isDraft and setting duration from start/end", () => {
    useCalendarStore.setState({ events: [makeDraft()] });

    useCalendarStore
      .getState()
      .scheduleLocal(
        "event-1",
        "2026-06-20T00:00:00.000Z",
        "2026-06-20T09:00:00.000Z",
        "2026-06-20T10:30:00.000Z",
      );

    const event = useCalendarStore.getState().events[0];
    expect(event.isDraft).toBe(false);
    expect(event.duration).toBe(90);
    expect(event.date).toBe("2026-06-20T00:00:00.000Z");
  });

  it("supports rollback by restoring a snapshot taken before the schedule", () => {
    const snapshot = [makeDraft()];
    useCalendarStore.setState({ events: snapshot });

    useCalendarStore
      .getState()
      .scheduleLocal(
        "event-1",
        "2026-06-20T00:00:00.000Z",
        "2026-06-20T09:00:00.000Z",
        "2026-06-20T10:00:00.000Z",
      );
    expect(useCalendarStore.getState().events[0].isDraft).toBe(false);

    // Simulates the rollback the calendar view performs when scheduleTask()
    // returns success:false.
    useCalendarStore.getState().setEvents(snapshot);

    expect(useCalendarStore.getState().events[0].isDraft).toBe(true);
    expect(useCalendarStore.getState().events[0].date).toBeNull();
  });

  it("moveToDraftLocal clears scheduling fields and sets isDraft", () => {
    const scheduled: CalendarEventDTO = {
      ...makeDraft(),
      isDraft: false,
      date: "2026-06-20T00:00:00.000Z",
      startTime: "2026-06-20T09:00:00.000Z",
      endTime: "2026-06-20T10:00:00.000Z",
      duration: 60,
    };
    useCalendarStore.setState({ events: [scheduled] });

    useCalendarStore.getState().moveToDraftLocal("event-1");

    const event = useCalendarStore.getState().events[0];
    expect(event.isDraft).toBe(true);
    expect(event.date).toBeNull();
    expect(event.startTime).toBeNull();
    expect(event.endTime).toBeNull();
  });

  it("mergeRangeEvents replaces only scheduled events within the new range, keeping drafts", () => {
    const draft = makeDraft();
    const oldScheduled: CalendarEventDTO = {
      ...makeDraft(),
      id: "event-2",
      isDraft: false,
      date: "2026-06-20T00:00:00.000Z",
    };
    useCalendarStore.setState({ events: [draft, oldScheduled] });

    const newScheduled: CalendarEventDTO = {
      ...makeDraft(),
      id: "event-3",
      isDraft: false,
      date: "2026-07-01T00:00:00.000Z",
    };
    useCalendarStore.getState().mergeRangeEvents([newScheduled]);

    const ids = useCalendarStore.getState().events.map((e) => e.id);
    expect(ids).toContain("event-1");
    expect(ids).toContain("event-2");
    expect(ids).toContain("event-3");
  });
});
