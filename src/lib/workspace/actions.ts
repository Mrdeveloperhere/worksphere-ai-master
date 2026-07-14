"use server";

import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";

import { ok, fail, type ActionResult } from "@/lib/action-result";
import { tryWorkspaceAccess } from "@/lib/auth/workspace-access";
import { prisma } from "@/lib/prisma";

export async function createWorkspace(name: string): Promise<ActionResult<{ id: string }>> {
  const { userId } = await auth();
  if (!userId) return fail("Not signed in");
  if (!name.trim()) return fail("Workspace name is required");

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return fail("User record not found");

  const workspace = await prisma.workspace.create({
    data: {
      name: name.trim(),
      members: {
        create: {
          userId,
          email: user.email,
          role: "OWNER",
          status: "ACTIVE",
          joinedAt: new Date(),
        },
      },
    },
  });

  revalidatePath("/dashboard");
  return ok({ id: workspace.id });
}

export async function renameWorkspace(
  workspaceId: string,
  name: string,
): Promise<ActionResult<void>> {
  if (!name.trim()) return fail("Workspace name is required");

  const access = await tryWorkspaceAccess(workspaceId, { role: "OWNER" });
  if (!access.ok) return fail(access.error);

  await prisma.workspace.update({
    where: { id: workspaceId },
    data: { name: name.trim() },
  });

  revalidatePath("/dashboard");
  return ok(undefined);
}

// Fetched separately from deleteWorkspace() so the UI can show "This will
// delete 3 boards, 12 tasks, and remove 2 other members" before the user
// confirms — the cascade-delete-with-confirmation pattern from the eng review.
export async function getWorkspaceDeletionImpact(
  workspaceId: string,
): Promise<ActionResult<{ boardCount: number; taskCount: number; memberCount: number }>> {
  const access = await tryWorkspaceAccess(workspaceId, { role: "OWNER" });
  if (!access.ok) return fail(access.error);

  const [boardCount, taskCount, memberCount] = await Promise.all([
    prisma.board.count({ where: { workspaceId } }),
    prisma.task.count({ where: { column: { board: { workspaceId } } } }),
    prisma.workspaceMember.count({ where: { workspaceId, status: "ACTIVE" } }),
  ]);

  return ok({ boardCount, taskCount, memberCount });
}

export async function deleteWorkspace(workspaceId: string): Promise<ActionResult<void>> {
  const access = await tryWorkspaceAccess(workspaceId, { role: "OWNER" });
  if (!access.ok) return fail(access.error);

  // onDelete: Cascade on workspace_members/boards/columns/tasks/comments in
  // schema.prisma handles the cascade at the database level.
  await prisma.workspace.delete({ where: { id: workspaceId } });

  revalidatePath("/dashboard");
  return ok(undefined);
}

export async function inviteMember(
  workspaceId: string,
  email: string,
): Promise<ActionResult<void>> {
  const normalizedEmail = email.trim().toLowerCase();
  if (!normalizedEmail) return fail("Email is required");

  const access = await tryWorkspaceAccess(workspaceId, { role: "OWNER" });
  if (!access.ok) return fail(access.error);

  const existingUser = await prisma.user.findUnique({
    where: { email: normalizedEmail },
  });

  try {
    await prisma.workspaceMember.create({
      data: {
        workspaceId,
        email: normalizedEmail,
        userId: existingUser?.id ?? null,
        role: "MEMBER",
        status: "INVITED",
      },
    });
  } catch (err) {
    if ((err as { code?: string }).code === "P2002") {
      return fail("This person is already a member or has a pending invite");
    }
    throw err;
  }

  revalidatePath("/dashboard");
  return ok(undefined);
}

export async function acceptInvite(membershipId: string): Promise<ActionResult<void>> {
  const { userId } = await auth();
  if (!userId) return fail("Not signed in");

  const membership = await prisma.workspaceMember.findUnique({
    where: { id: membershipId },
  });

  if (!membership || membership.userId !== userId) {
    return fail("Invite not found");
  }

  await prisma.workspaceMember.update({
    where: { id: membershipId },
    data: { status: "ACTIVE", joinedAt: new Date() },
  });

  revalidatePath("/dashboard");
  return ok(undefined);
}

export async function declineInvite(membershipId: string): Promise<ActionResult<void>> {
  const { userId } = await auth();
  if (!userId) return fail("Not signed in");

  const membership = await prisma.workspaceMember.findUnique({
    where: { id: membershipId },
  });

  if (!membership || membership.userId !== userId) {
    return fail("Invite not found");
  }

  await prisma.workspaceMember.delete({ where: { id: membershipId } });

  revalidatePath("/dashboard");
  return ok(undefined);
}

export async function removeMember(
  workspaceId: string,
  membershipId: string,
): Promise<ActionResult<void>> {
  const access = await tryWorkspaceAccess(workspaceId, { role: "OWNER" });
  if (!access.ok) return fail(access.error);

  const target = await prisma.workspaceMember.findFirst({
    where: { id: membershipId, workspaceId },
  });
  if (!target) return fail("Member not found");
  if (target.userId === access.userId) {
    return fail("You can't remove yourself as the owner");
  }

  await prisma.workspaceMember.delete({ where: { id: membershipId } });

  revalidatePath("/dashboard");
  return ok(undefined);
}

export async function updateWorkspacePlan(
  workspaceId: string,
  plan: string,
): Promise<ActionResult<void>> {
  const access = await tryWorkspaceAccess(workspaceId, { role: "OWNER" });
  if (!access.ok) return fail(access.error);

  await prisma.workspace.update({
    where: { id: workspaceId },
    data: { plan },
  });

  revalidatePath(`/dashboard/${workspaceId}`);
  return ok(undefined);
}
