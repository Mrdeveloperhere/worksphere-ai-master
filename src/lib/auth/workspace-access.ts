import "server-only";
import { auth } from "@clerk/nextjs/server";

import { prisma } from "@/lib/prisma";

// Single shared authorization path for every server action across Kanban,
// Calendar, and the AI agent (Phase 2+). Never re-implement this check
// inline in a module — that's how a missed check turns into a real
// workspace-isolation bug.
export class WorkspaceAccessError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "WorkspaceAccessError";
  }
}

type RequireWorkspaceAccessOptions = {
  // Omit for "any active member is enough". Pass "OWNER" for destructive
  // actions (delete workspace, remove member, invite member).
  role?: "OWNER";
};

export async function requireWorkspaceAccess(
  workspaceId: string,
  options: RequireWorkspaceAccessOptions = {},
) {
  const { userId } = await auth();
  if (!userId) {
    throw new WorkspaceAccessError("Not signed in");
  }

  const membership = await prisma.workspaceMember.findFirst({
    where: { workspaceId, userId, status: "ACTIVE" },
  });

  if (!membership) {
    throw new WorkspaceAccessError("Not a member of this workspace");
  }

  if (options.role === "OWNER" && membership.role !== "OWNER") {
    throw new WorkspaceAccessError("Only the workspace owner can do this");
  }

  return { userId, membership };
}

// Wraps requireWorkspaceAccess() so every server action can do:
//   const access = await tryWorkspaceAccess(workspaceId);
//   if (!access.ok) return fail(access.error);
// instead of repeating the same try/catch in every action.
export async function tryWorkspaceAccess(
  workspaceId: string,
  options: RequireWorkspaceAccessOptions = {},
) {
  try {
    const access = await requireWorkspaceAccess(workspaceId, options);
    return { ok: true as const, ...access };
  } catch (err) {
    if (err instanceof WorkspaceAccessError) {
      return { ok: false as const, error: err.message };
    }
    throw err;
  }
}
