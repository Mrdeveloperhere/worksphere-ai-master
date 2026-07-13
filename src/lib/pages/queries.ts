import "server-only";

import { prisma } from "@/lib/prisma";
import { serializePage, serializeSpace, type PageDTO, type SpaceDTO } from "@/lib/pages/helpers";

export async function listPages(workspaceId: string): Promise<PageDTO[]> {
  const pages = await prisma.page.findMany({
    where: { workspaceId },
    orderBy: { updatedAt: "desc" },
  });
  return pages.map(serializePage);
}

export async function listSpaces(workspaceId: string): Promise<SpaceDTO[]> {
  const spaces = await prisma.space.findMany({
    where: { workspaceId },
    orderBy: { createdAt: "asc" },
  });
  return spaces.map(serializeSpace);
}
