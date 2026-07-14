"use server";

import { revalidatePath } from "next/cache";

import { Prisma } from "@/generated/prisma/client";
import { ok, fail, type ActionResult } from "@/lib/action-result";
import { tryWorkspaceAccess } from "@/lib/auth/workspace-access";
import { prisma } from "@/lib/prisma";
import {
  getWorkspaceIdForPage,
  serializePage,
  serializeSpace,
  EMPTY_PAGE_CONTENT,
  type PageContent,
  type PageDTO,
  type SpaceDTO,
} from "@/lib/pages/helpers";

export async function createPage(
  workspaceId: string,
  spaceId?: string | null,
): Promise<ActionResult<PageDTO>> {
  const access = await tryWorkspaceAccess(workspaceId);
  if (!access.ok) return fail(access.error);

  const page = await prisma.page.create({
    data: {
      workspaceId,
      spaceId: spaceId || null,
      title: "Untitled page",
      content: EMPTY_PAGE_CONTENT as unknown as Prisma.InputJsonValue,
      createdById: access.userId,
    },
  });

  revalidatePath(`/dashboard/${workspaceId}/pages`);
  return ok(serializePage(page));
}

export async function updatePage(
  pageId: string,
  data: { title?: string; content?: PageContent; spaceId?: string | null },
): Promise<ActionResult<void>> {
  if (data.title !== undefined && !data.title.trim()) {
    return fail("Page title is required");
  }

  const workspaceId = await getWorkspaceIdForPage(pageId);
  const access = await tryWorkspaceAccess(workspaceId);
  if (!access.ok) return fail(access.error);

  await prisma.page.update({
    where: { id: pageId },
    data: {
      title: data.title?.trim(),
      spaceId: data.spaceId !== undefined ? data.spaceId : undefined,
      content: data.content
        ? (data.content as unknown as Prisma.InputJsonValue)
        : undefined,
    },
  });

  revalidatePath(`/dashboard/${workspaceId}/pages`);
  return ok(undefined);
}

export async function deletePage(pageId: string): Promise<ActionResult<void>> {
  const workspaceId = await getWorkspaceIdForPage(pageId);
  const access = await tryWorkspaceAccess(workspaceId);
  if (!access.ok) return fail(access.error);

  await prisma.page.delete({ where: { id: pageId } });
  revalidatePath(`/dashboard/${workspaceId}/pages`);
  return ok(undefined);
}

export async function createSpace(
  workspaceId: string,
  name: string,
  description?: string,
  color?: string,
): Promise<ActionResult<SpaceDTO>> {
  if (!name.trim()) return fail("Space name is required");

  const access = await tryWorkspaceAccess(workspaceId);
  if (!access.ok) return fail(access.error);

  const workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    select: { plan: true },
  });

  if (workspace?.plan !== "pro") {
    const spaceCount = await prisma.space.count({ where: { workspaceId } });
    if (spaceCount >= 2) {
      return fail("You have reached the limit of 2 spaces allowed on the Free plan. Please upgrade to create more spaces.");
    }
  }

  const space = await prisma.space.create({
    data: {
      workspaceId,
      name: name.trim(),
      description: description || null,
      color: color || "#6366f1",
    },
  });

  revalidatePath(`/dashboard/${workspaceId}/pages`);
  return ok(serializeSpace(space));
}

export async function deleteSpace(spaceId: string): Promise<ActionResult<void>> {
  const space = await prisma.space.findUniqueOrThrow({ where: { id: spaceId } });
  const access = await tryWorkspaceAccess(space.workspaceId);
  if (!access.ok) return fail(access.error);

  await prisma.space.delete({ where: { id: spaceId } });
  revalidatePath(`/dashboard/${space.workspaceId}/pages`);
  return ok(undefined);
}
