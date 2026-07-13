import "server-only";

import { prisma } from "@/lib/prisma";
import { serializeNote, type NoteDTO } from "@/lib/notes/helpers";

export async function listNotes(workspaceId: string): Promise<NoteDTO[]> {
  const notes = await prisma.note.findMany({
    where: { workspaceId },
    orderBy: [
      { isPinned: "desc" },
      { updatedAt: "desc" }
    ],
  });
  return notes.map(serializeNote);
}
