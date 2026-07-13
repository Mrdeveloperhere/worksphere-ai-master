import { requireWorkspaceAccess } from "@/lib/auth/workspace-access";
import { listNotes } from "@/lib/notes/queries";
import { NotesView } from "@/components/notes/notes-view";

export default async function NotesPage({
  params,
}: {
  params: Promise<{ workspaceId: string }>;
}) {
  const { workspaceId } = await params;
  await requireWorkspaceAccess(workspaceId);

  const notes = await listNotes(workspaceId);

  return <NotesView workspaceId={workspaceId} initialNotes={notes} />;
}
