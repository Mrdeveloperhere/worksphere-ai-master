import { requireWorkspaceAccess } from "@/lib/auth/workspace-access";
import { listPages, listSpaces } from "@/lib/pages/queries";
import { PagesView } from "@/components/pages/pages-view";

export default async function PagesPage({
  params,
}: {
  params: Promise<{ workspaceId: string }>;
}) {
  const { workspaceId } = await params;
  await requireWorkspaceAccess(workspaceId);

  const [pages, spaces] = await Promise.all([
    listPages(workspaceId),
    listSpaces(workspaceId),
  ]);

  return (
    <PagesView
      workspaceId={workspaceId}
      initialPages={pages}
      initialSpaces={spaces}
    />
  );
}
