import "server-only";

import type { Whiteboard } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

export async function getWorkspaceIdForWhiteboard(whiteboardId: string) {
  const board = await prisma.whiteboard.findUniqueOrThrow({ where: { id: whiteboardId } });
  return board.workspaceId;
}

// Kept as `unknown[]` rather than importing ExcalidrawElement[] — this
// module has no dependency on the canvas package; the client casts it.
export type WhiteboardElements = unknown[];

export type WhiteboardDTO = {
  id: string;
  title: string;
  elements: WhiteboardElements;
  createdById: string;
  updatedAt: string;
};

export function serializeWhiteboard(board: Whiteboard): WhiteboardDTO {
  return {
    id: board.id,
    title: board.title,
    elements: board.elements as WhiteboardElements,
    createdById: board.createdById,
    updatedAt: board.updatedAt.toISOString(),
  };
}
