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
  const latest = await prisma.conversation.findFirst({
    where: { workspaceId, userId },
    orderBy: { updatedAt: "desc" },
    include: { messages: { orderBy: { createdAt: "asc" } } },
  });
  if (latest) return latest;
  return await prisma.conversation.create({
    data: { workspaceId, userId },
    include: { messages: { orderBy: { createdAt: "asc" } } },
  });
}

export type ConversationResult = {
  activeId: string;
  messages: ChatMessageDTO[];
};

export async function getConversation(workspaceId: string): Promise<ActionResult<ConversationResult>> {
  const access = await tryWorkspaceAccess(workspaceId);
  if (!access.ok) return fail(access.error);

  const conversation = await getOrCreateConversation(workspaceId, access.userId);
  return ok({
    activeId: conversation.id,
    messages: conversation.messages.map(serializeMessage),
  });
}

export type ConversationListItem = {
  id: string;
  title: string;
  createdAt: string;
};

export async function listConversations(workspaceId: string): Promise<ActionResult<ConversationListItem[]>> {
  const access = await tryWorkspaceAccess(workspaceId);
  if (!access.ok) return fail(access.error);

  const convs = await prisma.conversation.findMany({
    where: { workspaceId, userId: access.userId },
    orderBy: { updatedAt: "desc" },
    include: {
      messages: {
        orderBy: { createdAt: "asc" },
        take: 1,
      },
    },
  });

  return ok(
    convs.map((c) => {
      const firstMsg = c.messages[0]?.content || "New Chat";
      const title = firstMsg.length > 22 ? firstMsg.substring(0, 22) + "..." : firstMsg;
      return {
        id: c.id,
        title,
        createdAt: c.createdAt.toISOString(),
      };
    })
  );
}

export async function createNewConversation(workspaceId: string): Promise<ActionResult<ConversationResult>> {
  const access = await tryWorkspaceAccess(workspaceId);
  if (!access.ok) return fail(access.error);

  const conversation = await prisma.conversation.create({
    data: { workspaceId, userId: access.userId },
    include: { messages: { orderBy: { createdAt: "asc" } } },
  });

  revalidatePath(`/dashboard/${workspaceId}/ai-assistant`);
  return ok({
    activeId: conversation.id,
    messages: [],
  });
}

export async function getConversationById(
  workspaceId: string,
  conversationId: string,
): Promise<ActionResult<ChatMessageDTO[]>> {
  const access = await tryWorkspaceAccess(workspaceId);
  if (!access.ok) return fail(access.error);

  const conv = await prisma.conversation.findUnique({
    where: { id: conversationId },
    include: { messages: { orderBy: { createdAt: "asc" } } },
  });

  if (!conv || conv.userId !== access.userId || conv.workspaceId !== workspaceId) {
    return fail("Conversation not found");
  }

  // Update updatedAt timestamp to bring it to the top of active list
  await prisma.conversation.update({
    where: { id: conversationId },
    data: { updatedAt: new Date() },
  });

  return ok(conv.messages.map(serializeMessage));
}

export async function sendMessage(
  workspaceId: string,
  content: string,
  conversationId?: string,
): Promise<ActionResult<ChatMessageDTO[]>> {
  if (!content.trim()) return fail("Message can't be empty");

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
      "The AI Assistant needs an API key — configure it in your Settings -> AI Settings.",
    );
  }
  const { client, model: activeModel } = ai;

  let conversation;
  if (conversationId) {
    conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
      include: { messages: { orderBy: { createdAt: "asc" } } },
    });
  }

  if (!conversation) {
    conversation = await getOrCreateConversation(workspaceId, access.userId);
  }

  // Update conversation updatedAt so it moves to top of history
  await prisma.conversation.update({
    where: { id: conversation.id },
    data: { updatedAt: new Date() },
  });

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

  try {
    for (let i = 0; i < MAX_ITERATIONS; i++) {
      const completion = await client.chat.completions.create({
        model: activeModel,
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
  } catch (error: any) {
    console.error("AI chat completion failed:", error);
    let errMsg = "AI Assistant request failed.";
    if (error?.status === 429 || error?.message?.includes("quota") || error?.message?.includes("RateLimitError")) {
      if (activeModel.startsWith("gemini")) {
        errMsg = "Gemini API quota exceeded. Please configure your own active Gemini API Key in Settings -> AI Settings to proceed.";
      } else {
        errMsg = "OpenAI API quota exceeded. Please configure your own active OpenAI API Key in Settings -> AI Settings to proceed.";
      }
    } else if (error?.message) {
      errMsg = error.message;
    }
    return fail(errMsg);
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
