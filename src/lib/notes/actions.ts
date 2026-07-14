"use server";

import { revalidatePath } from "next/cache";

import { ok, fail, type ActionResult } from "@/lib/action-result";
import { tryWorkspaceAccess } from "@/lib/auth/workspace-access";
import { prisma } from "@/lib/prisma";
import { getWorkspaceIdForNote, serializeNote, type NoteDTO } from "@/lib/notes/helpers";

export async function createNote(workspaceId: string): Promise<ActionResult<NoteDTO>> {
  const access = await tryWorkspaceAccess(workspaceId);
  if (!access.ok) return fail(access.error);

  const workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    select: { plan: true },
  });

  if (workspace?.plan !== "pro") {
    const noteCount = await prisma.note.count({ where: { workspaceId, isTrashed: false } });
    if (noteCount >= 10) {
      return fail("You have reached the limit of 10 notes allowed on the Free plan. Please upgrade to create more notes.");
    }
  }

  const note = await prisma.note.create({
    data: {
      workspaceId,
      title: "Untitled note",
      createdById: access.userId,
    },
  });

  revalidatePath(`/dashboard/${workspaceId}/notes`);
  return ok(serializeNote(note));
}

export async function updateNote(
  noteId: string,
  data: { title?: string; content?: string; isPinned?: boolean; isTrashed?: boolean },
): Promise<ActionResult<void>> {
  if (data.title !== undefined && !data.title.trim()) {
    return fail("Note title is required");
  }

  const workspaceId = await getWorkspaceIdForNote(noteId);
  const access = await tryWorkspaceAccess(workspaceId);
  if (!access.ok) return fail(access.error);

  await prisma.note.update({
    where: { id: noteId },
    data: {
      title: data.title?.trim(),
      content: data.content,
      isPinned: data.isPinned,
      isTrashed: data.isTrashed,
    },
  });

  revalidatePath(`/dashboard/${workspaceId}/notes`);
  return ok(undefined);
}

export async function deleteNote(noteId: string): Promise<ActionResult<void>> {
  const workspaceId = await getWorkspaceIdForNote(noteId);
  const access = await tryWorkspaceAccess(workspaceId);
  if (!access.ok) return fail(access.error);

  await prisma.note.delete({ where: { id: noteId } });
  revalidatePath(`/dashboard/${workspaceId}/notes`);
  return ok(undefined);
}
