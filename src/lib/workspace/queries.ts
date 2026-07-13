import "server-only";
import { auth } from "@clerk/nextjs/server";

import { prisma } from "@/lib/prisma";

export async function getUserWorkspaces() {
  const { userId } = await auth();
  if (!userId) return [];

  const memberships = await prisma.workspaceMember.findMany({
    where: { userId, status: "ACTIVE" },
    include: { workspace: true },
    orderBy: { workspace: { name: "asc" } },
  });

  return memberships.map((m) => ({
    id: m.workspace.id,
    name: m.workspace.name,
    role: m.role,
  }));
}

export async function getPendingInvitesForUser() {
  const { userId } = await auth();
  if (!userId) return [];

  const invites = await prisma.workspaceMember.findMany({
    where: { userId, status: "INVITED" },
    include: { workspace: true },
  });

  return invites.map((i) => ({
    membershipId: i.id,
    workspaceName: i.workspace.name,
  }));
}
