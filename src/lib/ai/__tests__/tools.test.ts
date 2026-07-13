import { describe, expect, it } from "vitest";

import { describeAction, READ_ONLY_TOOLS } from "@/lib/ai/tools";

// describeAction() text is what the user actually confirms/cancels in the
// chat UI before a mutation runs — a regression here would mean someone
// approves an action without understanding what it does.
describe("describeAction", () => {
  it("describes create_board", () => {
    expect(describeAction("create_board", { name: "Launch" })).toBe('Create board "Launch"');
  });

  it("describes create_task", () => {
    expect(describeAction("create_task", { title: "Write spec", columnId: "c1" })).toBe(
      'Create task "Write spec"',
    );
  });

  it("describes create_calendar_event with the date/time range", () => {
    expect(
      describeAction("create_calendar_event", {
        title: "Standup",
        date: "2026-06-20",
        startTime: "09:00",
        endTime: "09:15",
      }),
    ).toBe('Schedule "Standup" on 2026-06-20 from 09:00 to 09:15');
  });

  it("describes create_draft_task", () => {
    expect(describeAction("create_draft_task", { title: "Buy snacks" })).toBe(
      'Add draft task "Buy snacks"',
    );
  });

  it("falls back to the raw tool name for unknown tools", () => {
    expect(describeAction("delete_everything", {})).toBe("delete_everything");
  });
});

describe("READ_ONLY_TOOLS", () => {
  it("contains only the lookup tools, never a mutating one", () => {
    expect(READ_ONLY_TOOLS.has("list_boards")).toBe(true);
    expect(READ_ONLY_TOOLS.has("list_columns")).toBe(true);
    expect(READ_ONLY_TOOLS.has("create_task")).toBe(false);
    expect(READ_ONLY_TOOLS.has("create_calendar_event")).toBe(false);
  });
});
