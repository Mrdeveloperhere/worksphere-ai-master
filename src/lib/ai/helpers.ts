import "server-only";

import type { ChatMessage } from "@/generated/prisma/client";

export type PendingAction = { tool: string; args: Record<string, unknown> };

export type ChatMessageDTO = {
  id: string;
  role: "USER" | "ASSISTANT";
  content: string;
  pendingAction: PendingAction | null;
  createdAt: string;
};

export function serializeMessage(message: ChatMessage): ChatMessageDTO {
  return {
    id: message.id,
    role: message.role,
    content: message.content,
    pendingAction: (message.pendingAction as PendingAction | null) ?? null,
    createdAt: message.createdAt.toISOString(),
  };
}
