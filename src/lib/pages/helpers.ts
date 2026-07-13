import "server-only";

import type { Page } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

export async function getWorkspaceIdForPage(pageId: string) {
  const page = await prisma.page.findUniqueOrThrow({ where: { id: pageId } });
  return page.workspaceId;
}

// The shape Tiptap's useEditor() expects for `content` — a ProseMirror
// document node. Kept loose (not the full Tiptap JSONContent type) so this
// module has no dependency on the editor package; the client casts it.
export type PageContent = { type: string; content?: unknown[] };

export const EMPTY_PAGE_CONTENT: PageContent = { type: "doc", content: [] };

export type PageDTO = {
  id: string;
  title: string;
  content: PageContent;
  createdById: string;
  spaceId: string | null;
  updatedAt: string;
};

export function serializePage(page: Page): PageDTO {
  return {
    id: page.id,
    title: page.title,
    content: page.content as PageContent,
    createdById: page.createdById,
    spaceId: page.spaceId,
    updatedAt: page.updatedAt.toISOString(),
  };
}

export type SpaceDTO = {
  id: string;
  workspaceId: string;
  name: string;
  description: string | null;
  color: string;
  createdAt: string;
  updatedAt: string;
};

export function serializeSpace(space: any): SpaceDTO {
  return {
    id: space.id,
    workspaceId: space.workspaceId,
    name: space.name,
    description: space.description,
    color: space.color,
    createdAt: space.createdAt.toISOString(),
    updatedAt: space.updatedAt.toISOString(),
  };
}
