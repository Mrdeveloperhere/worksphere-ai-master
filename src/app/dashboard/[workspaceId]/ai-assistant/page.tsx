import { requireWorkspaceAccess } from "@/lib/auth/workspace-access";
import { getConversation } from "@/lib/ai/actions";
import { ChatView } from "@/components/ai/chat-view";
import { prisma } from "@/lib/prisma";

export default async function AiAssistantPage({
  params,
}: {
  params: Promise<{ workspaceId: string }>;
}) {
  const { workspaceId } = await params;
  await requireWorkspaceAccess(workspaceId);

  const [result, boardCount, noteCount, calendarCount] = await Promise.all([
    getConversation(workspaceId),
    prisma.board.count({ where: { workspaceId } }),
    prisma.note.count({ where: { workspaceId } }),
    prisma.calendarEvent.count({ where: { workspaceId, isDraft: false } }),
  ]);

  const initialMessages = result.success ? result.data : [];

  return (
    <ChatView
      workspaceId={workspaceId}
      initialMessages={initialMessages}
      boardCount={boardCount}
      noteCount={noteCount}
      calendarCount={calendarCount}
    />
  );
}
