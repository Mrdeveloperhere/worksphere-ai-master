"use server";

import type OpenAI from "openai";
import { revalidatePath } from "next/cache";

import { ok, fail, type ActionResult } from "@/lib/action-result";
import { tryWorkspaceAccess } from "@/lib/auth/workspace-access";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import { getOpenAIClient, OPENAI_MODEL } from "@/lib/ai/client";
import {
  TOOL_DEFS,
  READ_ONLY_TOOLS,
  executeReadOnlyTool,
  executeMutatingTool,
  describeAction,
} from "@/lib/ai/tools";
import { serializeMessage, type ChatMessageDTO, type PendingAction } from "@/lib/ai/helpers";

// Iteration cap from the design doc's AI Action Framework — bounds how many
// read-only lookups (list_boards, list_columns) the model can chain before
// it must either answer in plain text or propose a tool call for the user
// to confirm. Prevents a confused model from looping forever.
const MAX_ITERATIONS = 8;

const SYSTEM_PROMPT = `You are the AI assistant inside ProductivityHub AI, a productivity workspace combining Kanban boards and a Calendar.

Scope: you can only create Kanban boards/tasks and Calendar events/draft tasks in the user's current workspace. You cannot do anything else — if asked, politely say it's outside what you can do yet.

Rules:
- If you're missing information needed to call a tool (e.g. which board, what time), ask a short clarifying question as plain text instead of guessing.
- Use list_boards/list_columns to resolve names to IDs before calling create_task — don't guess IDs.
- When you have enough information, call exactly one tool. The user will be shown a confirmation before anything is actually created or scheduled — you do not need to ask "should I do this?" yourself, just call the tool.
- Keep replies short and conversational.`;

async function getOrCreateConversation(workspaceId: string, userId: string) {
  try {
    return await prisma.conversation.upsert({
      where: { workspaceId_userId: { workspaceId, userId } },
      update: {},
      create: { workspaceId, userId },
      include: { messages: { orderBy: { createdAt: "asc" } } },
    });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return await prisma.conversation.findUniqueOrThrow({
        where: { workspaceId_userId: { workspaceId, userId } },
        include: { messages: { orderBy: { createdAt: "asc" } } },
      });
    }
    throw err;
  }
}

export async function getConversation(workspaceId: string): Promise<ActionResult<ChatMessageDTO[]>> {
  const access = await tryWorkspaceAccess(workspaceId);
  if (!access.ok) return fail(access.error);

  const conversation = await getOrCreateConversation(workspaceId, access.userId);
  return ok(conversation.messages.map(serializeMessage));
}

export async function sendMessage(
  workspaceId: string,
  content: string,
): Promise<ActionResult<ChatMessageDTO[]>> {
  if (!content.trim()) return fail("Message can't be empty");

  const access = await tryWorkspaceAccess(workspaceId);
  if (!access.ok) return fail(access.error);

  const client = getOpenAIClient();
  if (!client) {
    return fail(
      "The AI Assistant needs an OpenAI API key — add OPENAI_API_KEY to your .env and restart the dev server.",
    );
  }

  const conversation = await getOrCreateConversation(workspaceId, access.userId);

  await prisma.chatMessage.create({
    data: { conversationId: conversation.id, role: "USER", content: content.trim() },
  });

  const history: OpenAI.Chat.ChatCompletionMessageParam[] = [
    { role: "system", content: SYSTEM_PROMPT },
    ...conversation.messages.map((m): OpenAI.Chat.ChatCompletionMessageParam => ({
      role: m.role === "USER" ? "user" : "assistant",
      content: m.content,
    })),
    { role: "user", content: content.trim() },
  ];

  const ctx = { workspaceId };
  let pendingAction: PendingAction | null = null;
  let finalText = "Sorry, I wasn't able to come up with a response — try rephrasing.";

  for (let i = 0; i < MAX_ITERATIONS; i++) {
    const completion = await client.chat.completions.create({
      model: OPENAI_MODEL,
      messages: history,
      tools: TOOL_DEFS,
    });

    const choice = completion.choices[0]?.message;
    if (!choice) break;

    if (!choice.tool_calls || choice.tool_calls.length === 0) {
      finalText = choice.content ?? finalText;
      break;
    }

    const toolCall = choice.tool_calls[0];
    if (!("function" in toolCall)) break;

    const toolName = toolCall.function.name;
    let args: Record<string, unknown> = {};
    try {
      args = JSON.parse(toolCall.function.arguments || "{}");
    } catch {
      // Malformed args — fall through with an empty object; the executor's
      // own validation (e.g. Date parsing) will produce a user-facing error.
    }

    if (READ_ONLY_TOOLS.has(toolName)) {
      const result = await executeReadOnlyTool(toolName, args, ctx);
      history.push({
        role: "assistant",
        content: choice.content,
        tool_calls: choice.tool_calls,
      });
      history.push({
        role: "tool",
        tool_call_id: toolCall.id,
        content: JSON.stringify(result),
      });
      continue;
    }

    pendingAction = { tool: toolName, args };
    finalText = `${describeAction(toolName, args)}?`;
    break;
  }

  await prisma.chatMessage.create({
    data: {
      conversationId: conversation.id,
      role: "ASSISTANT",
      content: finalText,
      pendingAction: pendingAction
        ? (pendingAction as unknown as Prisma.InputJsonValue)
        : Prisma.DbNull,
    },
  });

  revalidatePath(`/dashboard/${workspaceId}/ai-assistant`);

  const allMessages = await prisma.chatMessage.findMany({
    where: { conversationId: conversation.id },
    orderBy: { createdAt: "asc" },
  });
  return ok(allMessages.map(serializeMessage));
}

export async function confirmAction(
  workspaceId: string,
  messageId: string,
): Promise<ActionResult<ChatMessageDTO>> {
  const access = await tryWorkspaceAccess(workspaceId);
  if (!access.ok) return fail(access.error);

  const message = await prisma.chatMessage.findUniqueOrThrow({ where: { id: messageId } });
  const pending = message.pendingAction as PendingAction | null;
  if (!pending) return fail("This action was already resolved");

  const result = await executeMutatingTool(pending.tool, pending.args, { workspaceId });

  const updated = await prisma.chatMessage.update({
    where: { id: messageId },
    data: {
      pendingAction: Prisma.DbNull,
      content: result.success
        ? `✅ ${describeAction(pending.tool, pending.args)}`
        : `❌ ${result.error}`,
    },
  });

  revalidatePath(`/dashboard/${workspaceId}/ai-assistant`);
  return ok(serializeMessage(updated));
}

export async function cancelAction(
  workspaceId: string,
  messageId: string,
): Promise<ActionResult<ChatMessageDTO>> {
  const access = await tryWorkspaceAccess(workspaceId);
  if (!access.ok) return fail(access.error);

  const message = await prisma.chatMessage.findUniqueOrThrow({ where: { id: messageId } });
  const pending = message.pendingAction as PendingAction | null;
  if (!pending) return fail("This action was already resolved");

  const updated = await prisma.chatMessage.update({
    where: { id: messageId },
    data: { pendingAction: Prisma.DbNull, content: "Cancelled." },
  });

  revalidatePath(`/dashboard/${workspaceId}/ai-assistant`);
  return ok(serializeMessage(updated));
}
