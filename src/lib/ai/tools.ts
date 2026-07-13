import "server-only";
import type OpenAI from "openai";

import { fail, type ActionResult } from "@/lib/action-result";
import { createBoard, createTask, updateTask as updateKanbanTask } from "@/lib/kanban/actions";
import { listBoardsForWorkspace, listColumnsForBoard } from "@/lib/kanban/queries";
import { createDraftTask, createScheduledEvent } from "@/lib/calendar/actions";
import { EVENT_CATEGORIES } from "@/lib/calendar/constants";

// The AI Scheduling Agent is scoped to Kanban + Calendar only (per design
// doc) — no Notes/Whiteboard/Pages tools exist yet, and none should be
// added here until those features exist for real.
export const TOOL_DEFS: OpenAI.Chat.ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "list_boards",
      description: "List the Kanban boards in the current workspace, with their IDs.",
      parameters: { type: "object", properties: {}, additionalProperties: false },
    },
  },
  {
    type: "function",
    function: {
      name: "list_columns",
      description: "List the columns of a specific board, with their IDs.",
      parameters: {
        type: "object",
        properties: { boardId: { type: "string" } },
        required: ["boardId"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_board",
      description: "Create a new Kanban board with default columns (To Do, In Progress, Review, Done).",
      parameters: {
        type: "object",
        properties: { name: { type: "string", description: "Board name" } },
        required: ["name"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_task",
      description:
        "Create a Kanban task in a specific column. Call list_boards and list_columns first if you don't already know the columnId.",
      parameters: {
        type: "object",
        properties: {
          columnId: { type: "string" },
          title: { type: "string" },
          description: { type: "string" },
          priority: { type: "string", enum: ["LOW", "MEDIUM", "HIGH"] },
        },
        required: ["columnId", "title"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_calendar_event",
      description:
        "Schedule a calendar event at a specific date and time. Use this when the user gives (or implies) a specific date/time.",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string" },
          date: { type: "string", description: "YYYY-MM-DD, in the user's local time" },
          startTime: { type: "string", description: "HH:MM, 24-hour, in the user's local time" },
          endTime: { type: "string", description: "HH:MM, 24-hour, in the user's local time" },
          category: { type: "string", enum: [...EVENT_CATEGORIES] },
          description: { type: "string" },
        },
        required: ["title", "date", "startTime", "endTime"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_draft_task",
      description:
        "Add an unscheduled task to the Calendar draft panel — use this when the user wants to note something down without picking a specific time yet.",
      parameters: {
        type: "object",
        properties: { title: { type: "string" } },
        required: ["title"],
        additionalProperties: false,
      },
    },
  },
];

export const READ_ONLY_TOOLS = new Set(["list_boards", "list_columns"]);

type ToolContext = { workspaceId: string };

export async function executeReadOnlyTool(
  name: string,
  args: Record<string, unknown>,
  ctx: ToolContext,
): Promise<unknown> {
  if (name === "list_boards") {
    return { boards: await listBoardsForWorkspace(ctx.workspaceId) };
  }
  if (name === "list_columns") {
    return { columns: await listColumnsForBoard(String(args.boardId)) };
  }
  throw new Error(`Unknown read-only tool: ${name}`);
}

export async function executeMutatingTool(
  name: string,
  args: Record<string, unknown>,
  ctx: ToolContext,
): Promise<ActionResult<unknown>> {
  switch (name) {
    case "create_board":
      return createBoard(ctx.workspaceId, String(args.name));

    case "create_task": {
      const created = await createTask(String(args.columnId), String(args.title));
      if (!created.success) return created;
      if (args.description || args.priority) {
        await updateKanbanTask(created.data.id, {
          description: args.description ? String(args.description) : undefined,
          priority: args.priority as "LOW" | "MEDIUM" | "HIGH" | undefined,
        });
      }
      return created;
    }

    case "create_calendar_event": {
      const date = new Date(`${args.date}T00:00:00`);
      const startTime = new Date(`${args.date}T${args.startTime}:00`);
      const endTime = new Date(`${args.date}T${args.endTime}:00`);
      if ([date, startTime, endTime].some((d) => Number.isNaN(d.getTime()))) {
        return fail("I couldn't parse that date/time — could you rephrase it?");
      }
      return createScheduledEvent(
        ctx.workspaceId,
        String(args.title),
        date,
        startTime,
        endTime,
        args.category as (typeof EVENT_CATEGORIES)[number] | undefined,
        args.description ? String(args.description) : undefined,
      );
    }

    case "create_draft_task":
      return createDraftTask(ctx.workspaceId, String(args.title));

    default:
      return fail(`Unknown tool: ${name}`);
  }
}

export function describeAction(name: string, args: Record<string, unknown>): string {
  switch (name) {
    case "create_board":
      return `Create board "${args.name}"`;
    case "create_task":
      return `Create task "${args.title}"`;
    case "create_calendar_event":
      return `Schedule "${args.title}" on ${args.date} from ${args.startTime} to ${args.endTime}`;
    case "create_draft_task":
      return `Add draft task "${args.title}"`;
    default:
      return name;
  }
}
