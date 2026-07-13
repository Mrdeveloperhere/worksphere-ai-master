import { redirect } from "next/navigation";

import { getUserWorkspaces } from "@/lib/workspace/queries";

export default async function DashboardIndexPage() {
  const workspaces = await getUserWorkspaces();

  if (workspaces.length === 0) {
    // ensureUser() always provisions a default workspace, so this should be
    // unreachable in practice — but fail safe rather than loop-redirect.
    redirect("/");
  }

  redirect(`/dashboard/${workspaces[0].id}`);
}
