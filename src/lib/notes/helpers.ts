import "server-only";

import type { Note } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

export async function getWorkspaceIdForNote(noteId: string) {
  const note = await prisma.note.findUniqueOrThrow({ where: { id: noteId } });
  return note.workspaceId;
}

export type NoteDTO = {
  id: string;
  title: string;
  content: string;
  createdById: string;
  isPinned: boolean;
  isTrashed: boolean;
  updatedAt: string;
};

export function serializeNote(note: Note): NoteDTO {
  return {
    id: note.id,
    title: note.title,
    content: note.content,
    createdById: note.createdById,
    isPinned: note.isPinned,
    isTrashed: note.isTrashed,
    updatedAt: note.updatedAt.toISOString(),
  };
}
