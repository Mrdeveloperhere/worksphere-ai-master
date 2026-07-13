"use client";

import { useEffect } from "react";
import { toast } from "sonner";
import { FileText, BookOpen } from "lucide-react";
import { useSearchParams } from "next/navigation";

import { NotesList } from "@/components/notes/notes-list";
import { NoteEditor } from "@/components/notes/note-editor";
import { createNote } from "@/lib/notes/actions";
import { useNotesStore, type NoteDTO } from "@/lib/stores/notes-store";

export function NotesView({
  workspaceId,
  initialNotes,
}: {
  workspaceId: string;
  initialNotes: NoteDTO[];
}) {
  const searchParams = useSearchParams();
  const queryId = searchParams.get("id");

  const notes = useNotesStore((s) => s.notes);
  const selectedId = useNotesStore((s) => s.selectedId);
  const setNotes = useNotesStore((s) => s.setNotes);
  const selectNote = useNotesStore((s) => s.selectNote);
  const upsertLocal = useNotesStore((s) => s.upsertLocal);
  const patchLocal = useNotesStore((s) => s.patchLocal);
  const removeLocal = useNotesStore((s) => s.removeLocal);

  useEffect(() => {
    setNotes(initialNotes);
    if (queryId && initialNotes.some((n) => n.id === queryId)) {
      selectNote(queryId);
    } else if (initialNotes.length > 0) {
      // Pick first non-trashed note by default
      const active = initialNotes.find((n) => !n.isTrashed);
      if (active) selectNote(active.id);
    }
  }, []);

  async function handleCreate() {
    const result = await createNote(workspaceId);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    upsertLocal(result.data);
    selectNote(result.data.id);
    toast.success("Note created successfully!");
  }

  const selectedNote = selectedId ? notes.find((n) => n.id === selectedId) ?? null : null;

  return (
    <div className="flex h-full flex-col gap-6 p-6 bg-[#FBF9F6] dark:bg-[#0C0C0D] text-neutral-800 dark:text-neutral-200">
      
      {/* Page Title & Header */}
      <div className="flex items-center gap-3">
        <div className="bg-[#E0F2FE] p-2.5 rounded-2xl text-[#0284C7] shadow-sm shrink-0">
          <BookOpen className="size-6" />
        </div>
        <div className="space-y-0.5">
          <span className="text-[10px] font-bold text-red-500 uppercase tracking-widest">
            Notes
          </span>
          <h1 className="text-2xl font-bold tracking-tight text-neutral-800 dark:text-neutral-100 sm:text-3xl leading-none">
            Capture the shape of your thinking.
          </h1>
        </div>
      </div>

      {/* Main Split Panel Canvas */}
      <div className="rounded-3xl border border-neutral-200/60 bg-white shadow-xs dark:border-neutral-800/80 dark:bg-[#121214]/60 flex flex-1 overflow-hidden min-h-0">
        <NotesList
          notes={notes}
          selectedId={selectedId}
          onSelect={selectNote}
          onCreate={() => void handleCreate()}
        />

        {selectedNote ? (
          <NoteEditor
            key={selectedNote.id}
            note={selectedNote}
            onUpdated={patchLocal}
            onDeleted={removeLocal}
          />
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center gap-2 text-center text-muted-foreground bg-white/40 dark:bg-[#121214]/40">
            <FileText className="size-8 text-neutral-400" />
            <p className="text-sm">Select a note or create a new one.</p>
          </div>
        )}
      </div>

    </div>
  );
}
