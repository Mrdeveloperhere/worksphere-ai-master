import type { GeneratedSection } from "@/lib/templates/types";
import type { PageContent } from "@/lib/pages/helpers";

// Deterministic transform from the LLM's plain outline (heading/paragraph/
// bullets) into a Tiptap document — asking the model to emit raw
// ProseMirror JSON directly would be far less reliable than this simple,
// fixed mapping.
export function buildPageContent(sections: GeneratedSection[]): PageContent {
  return {
    type: "doc",
    content: sections.flatMap((section) => {
      const nodes: object[] = [
        {
          type: "heading",
          attrs: { level: section.level },
          content: [{ type: "text", text: section.heading }],
        },
      ];

      if (section.paragraph) {
        nodes.push({
          type: "paragraph",
          content: [{ type: "text", text: section.paragraph }],
        });
      }

      if (section.bullets && section.bullets.length > 0) {
        nodes.push({
          type: "bulletList",
          content: section.bullets.map((bullet) => ({
            type: "listItem",
            content: [{ type: "paragraph", content: [{ type: "text", text: bullet }] }],
          })),
        });
      }

      return nodes;
    }),
  };
}
