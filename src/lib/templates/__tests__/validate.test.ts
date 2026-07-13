import { describe, expect, it } from "vitest";

import { isValidBoardTemplate, isValidPageTemplate } from "@/lib/templates/validate";

// These guard the boundary between untrusted LLM JSON output and a
// prisma.create() call — a regression here means malformed AI output could
// reach the database.
describe("isValidBoardTemplate", () => {
  it("accepts a well-formed board with nulls in place of optional fields", () => {
    expect(
      isValidBoardTemplate({
        boardName: "Sprint Planning",
        columns: [
          {
            name: "To Do",
            tasks: [{ title: "Write spec", description: null, priority: null, labels: null }],
          },
        ],
      }),
    ).toBe(true);
  });

  it("accepts optional fields filled in", () => {
    expect(
      isValidBoardTemplate({
        boardName: "Sprint Planning",
        columns: [
          {
            name: "To Do",
            tasks: [
              {
                title: "Write spec",
                description: "Draft the RFC",
                priority: "HIGH",
                labels: ["docs"],
              },
            ],
          },
        ],
      }),
    ).toBe(true);
  });

  it("rejects a missing boardName", () => {
    expect(isValidBoardTemplate({ columns: [] })).toBe(false);
  });

  it("rejects an empty columns array", () => {
    expect(isValidBoardTemplate({ boardName: "Empty", columns: [] })).toBe(false);
  });

  it("rejects an invalid priority value", () => {
    expect(
      isValidBoardTemplate({
        boardName: "Board",
        columns: [
          { name: "To Do", tasks: [{ title: "Task", priority: "URGENT" }] },
        ],
      }),
    ).toBe(false);
  });

  it("rejects a task with a blank title", () => {
    expect(
      isValidBoardTemplate({
        boardName: "Board",
        columns: [{ name: "To Do", tasks: [{ title: "   " }] }],
      }),
    ).toBe(false);
  });

  it("rejects non-object input", () => {
    expect(isValidBoardTemplate(null)).toBe(false);
    expect(isValidBoardTemplate("not a board")).toBe(false);
  });
});

describe("isValidPageTemplate", () => {
  it("accepts a well-formed page with nulls in place of optional fields", () => {
    expect(
      isValidPageTemplate({
        title: "Onboarding Guide",
        sections: [{ heading: "Welcome", level: 1, paragraph: null, bullets: null }],
      }),
    ).toBe(true);
  });

  it("rejects an invalid heading level", () => {
    expect(
      isValidPageTemplate({
        title: "Guide",
        sections: [{ heading: "Welcome", level: 4 }],
      }),
    ).toBe(false);
  });

  it("rejects an empty sections array", () => {
    expect(isValidPageTemplate({ title: "Guide", sections: [] })).toBe(false);
  });

  it("rejects bullets that aren't strings", () => {
    expect(
      isValidPageTemplate({
        title: "Guide",
        sections: [{ heading: "Welcome", level: 1, bullets: [1, 2, 3] }],
      }),
    ).toBe(false);
  });
});
