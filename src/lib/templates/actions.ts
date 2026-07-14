"use server";

import { revalidatePath } from "next/cache";

import { Prisma } from "@/generated/prisma/client";
import { ok, fail, type ActionResult } from "@/lib/action-result";
import { tryWorkspaceAccess } from "@/lib/auth/workspace-access";
import { prisma } from "@/lib/prisma";
import { getOpenAIClient, OPENAI_MODEL } from "@/lib/ai/client";
import { buildPageContent } from "@/lib/templates/page-content";
import { isValidBoardTemplate, isValidPageTemplate } from "@/lib/templates/validate";
import type {
  GeneratedBoardTemplate,
  GeneratedPageTemplate,
  GeneratedTemplate,
  TemplateKind,
} from "@/lib/templates/types";

const BOARD_SCHEMA = {
  type: "object",
  properties: {
    boardName: { type: "string" },
    columns: {
      type: "array",
      items: {
        type: "object",
        properties: {
          name: { type: "string" },
          tasks: {
            type: "array",
            items: {
              type: "object",
              properties: {
                title: { type: "string" },
                description: { type: ["string", "null"] },
                priority: { type: ["string", "null"], enum: ["LOW", "MEDIUM", "HIGH", null] },
                labels: { type: ["array", "null"], items: { type: "string" } },
              },
              required: ["title", "description", "priority", "labels"],
              additionalProperties: false,
            },
          },
        },
        required: ["name", "tasks"],
        additionalProperties: false,
      },
    },
  },
  required: ["boardName", "columns"],
  additionalProperties: false,
};

const PAGE_SCHEMA = {
  type: "object",
  properties: {
    title: { type: "string" },
    sections: {
      type: "array",
      items: {
        type: "object",
        properties: {
          heading: { type: "string" },
          level: { type: "integer", enum: [1, 2, 3] },
          paragraph: { type: ["string", "null"] },
          bullets: { type: ["array", "null"], items: { type: "string" } },
        },
        required: ["heading", "level", "paragraph", "bullets"],
        additionalProperties: false,
      },
    },
  },
  required: ["title", "sections"],
  additionalProperties: false,
};

const SYSTEM_PROMPT = `You generate starter templates for ProductivityHub AI, a productivity workspace. Given a short user description, produce a structured outline (a Kanban board's columns/tasks, or a document's sections) — concise, practical, and directly usable as a starting point. Don't pad with filler content.`;

export async function generateTemplate(
  workspaceId: string,
  kind: TemplateKind,
  prompt: string,
): Promise<ActionResult<GeneratedTemplate>> {
  if (!prompt.trim()) return fail("Describe what you want before generating");

  const access = await tryWorkspaceAccess(workspaceId);
  if (!access.ok) return fail(access.error);

  let ai;
  try {
    ai = await getOpenAIClient(access.userId);
  } catch (err: any) {
    return fail(err.message || "Failed to initialize AI Client");
  }

  if (!ai) {
    return fail(
      "The Template Builder needs an API key — configure it in your Settings -> AI Settings.",
    );
  }
  const { client, model: activeModel } = ai;

  const schema = kind === "board" ? BOARD_SCHEMA : PAGE_SCHEMA;
  const schemaName = kind === "board" ? "board_template" : "page_template";

  let raw: string | null;
  try {
    const completion = await client.chat.completions.create({
      model: activeModel,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: prompt.trim() },
      ],
      response_format: {
        type: "json_schema",
        json_schema: { name: schemaName, schema, strict: true },
      },
    });
    raw = completion.choices[0]?.message.content ?? null;
  } catch (error: any) {
    console.error("AI template generation failed:", error);
    let errMsg = "The AI request failed — try again in a moment.";
    if (error?.status === 429 || error?.message?.includes("quota") || error?.message?.includes("RateLimitError")) {
      if (activeModel.startsWith("gemini")) {
        errMsg = "Gemini API quota exceeded. Please configure your own active Gemini API Key in Settings -> AI Settings to proceed.";
      } else {
        errMsg = "OpenAI API quota exceeded. Please configure your own active OpenAI API Key in Settings -> AI Settings to proceed.";
      }
    } else if (error?.message) {
      errMsg = `AI generation failed: ${error.message}`;
    }
    return fail(errMsg);
  }

  if (!raw) return fail("The AI didn't return anything usable — try rephrasing.");

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return fail("The AI returned malformed output — try again.");
  }

  if (kind === "board") {
    if (!isValidBoardTemplate(parsed)) {
      return fail("The AI's board structure didn't come back valid — try again.");
    }
    return ok({ kind: "board", data: parsed });
  }

  if (!isValidPageTemplate(parsed)) {
    return fail("The AI's page structure didn't come back valid — try again.");
  }
  return ok({ kind: "page", data: parsed });
}

export async function createBoardFromTemplate(
  workspaceId: string,
  template: GeneratedBoardTemplate,
): Promise<ActionResult<{ id: string }>> {
  if (!isValidBoardTemplate(template)) return fail("Invalid board template");

  const access = await tryWorkspaceAccess(workspaceId);
  if (!access.ok) return fail(access.error);

  const board = await prisma.board.create({
    data: {
      workspaceId,
      name: template.boardName,
      createdById: access.userId,
      columns: {
        create: template.columns.map((column, columnIndex) => ({
          name: column.name,
          position: columnIndex,
          tasks: {
            create: column.tasks.map((task, taskIndex) => ({
              title: task.title,
              description: task.description ?? undefined,
              priority: task.priority ?? "MEDIUM",
              labels: task.labels ?? [],
              position: taskIndex,
              createdById: access.userId,
            })),
          },
        })),
      },
    },
  });

  revalidatePath(`/dashboard/${workspaceId}`);
  return ok({ id: board.id });
}

export async function createPageFromTemplate(
  workspaceId: string,
  template: GeneratedPageTemplate,
): Promise<ActionResult<{ id: string }>> {
  if (!isValidPageTemplate(template)) return fail("Invalid page template");

  const access = await tryWorkspaceAccess(workspaceId);
  if (!access.ok) return fail(access.error);

  const page = await prisma.page.create({
    data: {
      workspaceId,
      title: template.title,
      content: buildPageContent(template.sections) as unknown as Prisma.InputJsonValue,
      createdById: access.userId,
    },
  });

  revalidatePath(`/dashboard/${workspaceId}/pages`);
  return ok({ id: page.id });
}
