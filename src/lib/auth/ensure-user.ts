import "server-only";
import { currentUser } from "@clerk/nextjs/server";

import { prisma } from "@/lib/prisma";
import { isPrismaUniqueConstraintError } from "@/lib/action-result";
import { DEFAULT_COLUMNS } from "@/lib/kanban/constants";

// Called from the dashboard layout on every authenticated load (no Clerk
// webhook dependency). Upsert is atomic at the DB level (INSERT ... ON
// CONFLICT), so concurrent first-load requests from multiple tabs/devices
// can't create duplicate user rows.
export async function ensureUser() {
  const clerkUser = await currentUser();
  if (!clerkUser) {
    throw new Error("ensureUser() called without an authenticated Clerk session");
  }

  const rawEmail =
    clerkUser.emailAddresses.find((e) => e.id === clerkUser.primaryEmailAddressId)
      ?.emailAddress ?? clerkUser.emailAddresses[0]?.emailAddress;

  if (!rawEmail) {
    throw new Error(`Clerk user ${clerkUser.id} has no email address`);
  }
  const email = rawEmail.trim().toLowerCase();

  const name =
    [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(" ") || null;

  const user = await prisma.user.upsert({
    where: { id: clerkUser.id },
    update: { email, name, image: clerkUser.imageUrl },
    create: { id: clerkUser.id, email, name, image: clerkUser.imageUrl },
  });

  // These two are independent of each other (both only need `user.id`), so
  // they run as one round trip instead of two — the membership count below
  // still has to wait for the invite-linking update to land first, since it
  // affects whether a default workspace gets provisioned.
  await Promise.all([
    // Link any pending invites sent to this email before they ever logged
    // in. Status stays INVITED — the user still has to explicitly accept.
    prisma.workspaceMember.updateMany({
      where: { email, userId: null },
      data: { userId: user.id },
    }),
    prisma.settings.upsert({
      where: { userId: user.id },
      update: {},
      create: { userId: user.id },
    }),
  ]);

  const membershipCount = await prisma.workspaceMember.count({
    where: { userId: user.id },
  });

  if (membershipCount === 0) {
    await provisionDefaultWorkspace(user.id, email, name);
  }

  return user;
}

// Default workspace gets a deterministic ID derived from the user's ID, so
// concurrent first-load requests racing past the membershipCount===0 check
// above collide on the same primary key instead of creating two workspaces
// — the loser's create() throws P2002, which we treat as a no-op.
async function provisionDefaultWorkspace(
  userId: string,
  email: string,
  name: string | null,
) {
  const defaultWorkspaceId = `ws-default-${userId}`;

  try {
    await prisma.$transaction(async (tx) => {
      const workspace = await tx.workspace.create({
        data: {
          id: defaultWorkspaceId,
          name: name ? `${name}'s Workspace` : "My Workspace",
          members: {
            create: {
              userId,
              email,
              role: "OWNER",
              status: "ACTIVE",
              joinedAt: new Date(),
            },
          },
        },
      });

      const board = await tx.board.create({
        data: {
          workspaceId: workspace.id,
          name: "My Board",
          createdById: userId,
        },
      });

      await tx.column.createMany({
        data: DEFAULT_COLUMNS.map((columnName, index) => ({
          boardId: board.id,
          name: columnName,
          position: index,
        })),
      });
    });
  } catch (err) {
    if (isPrismaUniqueConstraintError(err)) {
      return;
    }
    throw err;
  }
}
