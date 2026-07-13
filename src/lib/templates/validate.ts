import type {
  GeneratedBoardTemplate,
  GeneratedColumn,
  GeneratedPageTemplate,
  GeneratedSection,
  GeneratedTask,
} from "@/lib/templates/types";

// The LLM's JSON output is untrusted input — even with response_format
// strict schema, defend against malformed/missing fields before this data
// reaches a prisma.create() call.
const PRIORITIES = new Set(["LOW", "MEDIUM", "HIGH"]);

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

// OpenAI's strict structured-output mode can't express "optional" — it
// sends explicit `null` for fields the model left out, instead of omitting
// the key. `!= null` (not `!== undefined`) treats both the same as "absent".
function isValidTask(value: unknown): value is GeneratedTask {
  if (typeof value !== "object" || value === null) return false;
  const task = value as Record<string, unknown>;
  if (!isNonEmptyString(task.title)) return false;
  if (task.description != null && typeof task.description !== "string") return false;
  if (task.priority != null && !PRIORITIES.has(task.priority as string)) return false;
  if (task.labels != null) {
    if (!Array.isArray(task.labels) || !task.labels.every((l) => typeof l === "string")) {
      return false;
    }
  }
  return true;
}

function isValidColumn(value: unknown): value is GeneratedColumn {
  if (typeof value !== "object" || value === null) return false;
  const column = value as Record<string, unknown>;
  return (
    isNonEmptyString(column.name) &&
    Array.isArray(column.tasks) &&
    column.tasks.every(isValidTask)
  );
}

export function isValidBoardTemplate(value: unknown): value is GeneratedBoardTemplate {
  if (typeof value !== "object" || value === null) return false;
  const board = value as Record<string, unknown>;
  return (
    isNonEmptyString(board.boardName) &&
    Array.isArray(board.columns) &&
    board.columns.length > 0 &&
    board.columns.every(isValidColumn)
  );
}

function isValidSection(value: unknown): value is GeneratedSection {
  if (typeof value !== "object" || value === null) return false;
  const section = value as Record<string, unknown>;
  if (!isNonEmptyString(section.heading)) return false;
  if (![1, 2, 3].includes(section.level as number)) return false;
  if (section.paragraph != null && typeof section.paragraph !== "string") return false;
  if (section.bullets != null) {
    if (!Array.isArray(section.bullets) || !section.bullets.every((b) => typeof b === "string")) {
      return false;
    }
  }
  return true;
}

export function isValidPageTemplate(value: unknown): value is GeneratedPageTemplate {
  if (typeof value !== "object" || value === null) return false;
  const page = value as Record<string, unknown>;
  return (
    isNonEmptyString(page.title) &&
    Array.isArray(page.sections) &&
    page.sections.length > 0 &&
    page.sections.every(isValidSection)
  );
}
