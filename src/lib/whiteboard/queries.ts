import "server-only";

import { prisma } from "@/lib/prisma";
import { serializeWhiteboard, type WhiteboardDTO } from "@/lib/whiteboard/helpers";

export async function listWhiteboards(workspaceId: string): Promise<WhiteboardDTO[]> {
  const boards = await prisma.whiteboard.findMany({
    where: { workspaceId },
    orderBy: { updatedAt: "desc" },
  });
  return boards.map(serializeWhiteboard);
}
