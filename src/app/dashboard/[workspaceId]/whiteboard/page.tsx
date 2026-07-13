import { requireWorkspaceAccess } from "@/lib/auth/workspace-access";
import { listWhiteboards } from "@/lib/whiteboard/queries";
import { WhiteboardView } from "@/components/whiteboard/whiteboard-view";

export default async function WhiteboardPage({
  params,
}: {
  params: Promise<{ workspaceId: string }>;
}) {
  const { workspaceId } = await params;
  await requireWorkspaceAccess(workspaceId);

  const boards = await listWhiteboards(workspaceId);

  return <WhiteboardView workspaceId={workspaceId} initialBoards={boards} />;
}
