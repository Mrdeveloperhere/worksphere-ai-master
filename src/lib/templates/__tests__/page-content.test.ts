import { describe, expect, it } from "vitest";

import { buildPageContent } from "@/lib/templates/page-content";

describe("buildPageContent", () => {
  it("produces a heading node for each section", () => {
    const content = buildPageContent([{ heading: "Welcome", level: 1 }]);
    expect(content).toEqual({
      type: "doc",
      content: [
        {
          type: "heading",
          attrs: { level: 1 },
          content: [{ type: "text", text: "Welcome" }],
        },
      ],
    });
  });

  it("adds a paragraph node when paragraph text is present", () => {
    const content = buildPageContent([
      { heading: "Intro", level: 2, paragraph: "Some context." },
    ]);
    expect(content.content).toHaveLength(2);
    expect(content.content?.[1]).toEqual({
      type: "paragraph",
      content: [{ type: "text", text: "Some context." }],
    });
  });

  it("adds a bulletList node with one listItem per bullet", () => {
    const content = buildPageContent([
      { heading: "Checklist", level: 2, bullets: ["First", "Second"] },
    ]);
    const bulletList = content.content?.[1] as { type: string; content: unknown[] };
    expect(bulletList.type).toBe("bulletList");
    expect(bulletList.content).toHaveLength(2);
  });

  it("skips paragraph/bulletList nodes when those fields are absent", () => {
    const content = buildPageContent([{ heading: "Just a heading", level: 3 }]);
    expect(content.content).toHaveLength(1);
  });

  it("flattens nodes across multiple sections in order", () => {
    const content = buildPageContent([
      { heading: "First", level: 1, paragraph: "A" },
      { heading: "Second", level: 1, bullets: ["B"] },
    ]);
    expect(content.content).toHaveLength(4);
  });
});
