import { create } from "zustand";

import type { NoteDTO } from "@/lib/notes/helpers";

export type { NoteDTO };

type NotesState = {
  notes: NoteDTO[];
  selectedId: string | null;
  setNotes: (notes: NoteDTO[]) => void;
  selectNote: (id: string | null) => void;
  upsertLocal: (note: NoteDTO) => void;
  patchLocal: (id: string, patch: Partial<NoteDTO>) => void;
  removeLocal: (id: string) => void;
};

// List is sorted by updatedAt desc on the server; patchLocal re-sorts after
// every edit so the most recently touched note stays pinned to the top,
// matching what a fresh listNotes() fetch would return.
export const useNotesStore = create<NotesState>((set, get) => ({
  notes: [],
  selectedId: null,
  setNotes: (notes) => set({ notes }),
  selectNote: (id) => set({ selectedId: id }),
  upsertLocal: (note) => {
    const exists = get().notes.some((n) => n.id === note.id);
    set({
      notes: exists
        ? get().notes.map((n) => (n.id === note.id ? note : n))
        : [note, ...get().notes],
    });
  },
  patchLocal: (id, patch) => {
    const updated = get().notes.map((n) => (n.id === id ? { ...n, ...patch } : n));
    updated.sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      return b.updatedAt.localeCompare(a.updatedAt);
    });
    set({ notes: updated });
  },
  removeLocal: (id) =>
    set({
      notes: get().notes.filter((n) => n.id !== id),
      selectedId: get().selectedId === id ? null : get().selectedId,
    }),
}));
