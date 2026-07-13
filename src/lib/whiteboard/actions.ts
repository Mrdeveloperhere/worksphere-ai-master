"use server";

import { revalidatePath } from "next/cache";

import { Prisma } from "@/generated/prisma/client";
import { ok, fail, type ActionResult } from "@/lib/action-result";
import { tryWorkspaceAccess } from "@/lib/auth/workspace-access";
import { prisma } from "@/lib/prisma";
import {
  getWorkspaceIdForWhiteboard,
  serializeWhiteboard,
  type WhiteboardDTO,
  type WhiteboardElements,
} from "@/lib/whiteboard/helpers";

export async function createWhiteboard(
  workspaceId: string,
): Promise<ActionResult<WhiteboardDTO>> {
  const access = await tryWorkspaceAccess(workspaceId);
  if (!access.ok) return fail(access.error);

  const whiteboardCount = await prisma.whiteboard.count({ where: { workspaceId } });
  if (whiteboardCount >= 2) {
    return fail("You have reached the limit of 2 whiteboards allowed on the Free plan. Please upgrade to create more whiteboards.");
  }

  const board = await prisma.whiteboard.create({
    data: {
      workspaceId,
      title: "Untitled board",
      createdById: access.userId,
    },
  });

  revalidatePath(`/dashboard/${workspaceId}/whiteboard`);
  return ok(serializeWhiteboard(board));
}

export async function updateWhiteboard(
  whiteboardId: string,
  data: { title?: string; elements?: WhiteboardElements },
): Promise<ActionResult<void>> {
  if (data.title !== undefined && !data.title.trim()) {
    return fail("Whiteboard title is required");
  }

  const workspaceId = await getWorkspaceIdForWhiteboard(whiteboardId);
  const access = await tryWorkspaceAccess(workspaceId);
  if (!access.ok) return fail(access.error);

  await prisma.whiteboard.update({
    where: { id: whiteboardId },
    data: {
      title: data.title?.trim(),
      elements: data.elements
        ? (data.elements as unknown as Prisma.InputJsonValue)
        : undefined,
    },
  });

  revalidatePath(`/dashboard/${workspaceId}/whiteboard`);
  return ok(undefined);
}

export async function deleteWhiteboard(whiteboardId: string): Promise<ActionResult<void>> {
  const workspaceId = await getWorkspaceIdForWhiteboard(whiteboardId);
  const access = await tryWorkspaceAccess(workspaceId);
  if (!access.ok) return fail(access.error);

  await prisma.whiteboard.delete({ where: { id: whiteboardId } });
  revalidatePath(`/dashboard/${workspaceId}/whiteboard`);
  return ok(undefined);
}
