import { Suspense } from "react";
import { requireWorkspaceAccess } from "@/lib/auth/workspace-access";
import { prisma } from "@/lib/prisma";
import { TemplateBuilderView } from "@/components/templates/template-builder-view";

export default async function TemplateBuilderPage({
  params,
}: {
  params: Promise<{ workspaceId: string }>;
}) {
  const { workspaceId } = await params;
  await requireWorkspaceAccess(workspaceId);

  const workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    select: { plan: true },
  });
  const plan = workspace?.plan || "free";

  return (
    <Suspense fallback={<div className="p-6 text-sm text-neutral-400">Loading AI template builder...</div>}>
      <TemplateBuilderView workspaceId={workspaceId} initialPlan={plan} />
    </Suspense>
  );
}
