import { describe, expect, it, beforeEach } from "vitest";

import { useNotesStore, type NoteDTO } from "@/lib/stores/notes-store";

function makeNote(overrides: Partial<NoteDTO> = {}): NoteDTO {
  return {
    id: "note-1",
    title: "Untitled note",
    content: "",
    createdById: "user-1",
    updatedAt: "2026-06-18T00:00:00.000Z",
    ...overrides,
  };
}

describe("useNotesStore", () => {
  beforeEach(() => {
    useNotesStore.setState({ notes: [], selectedId: null });
  });

  it("upsertLocal adds a new note and updates an existing one", () => {
    const note = makeNote();
    useNotesStore.getState().upsertLocal(note);
    expect(useNotesStore.getState().notes).toHaveLength(1);

    useNotesStore.getState().upsertLocal({ ...note, title: "Renamed" });
    const notes = useNotesStore.getState().notes;
    expect(notes).toHaveLength(1);
    expect(notes[0].title).toBe("Renamed");
  });

  it("patchLocal applies a partial update and re-sorts by updatedAt desc", () => {
    const older = makeNote({ id: "note-1", updatedAt: "2026-06-17T00:00:00.000Z" });
    const newer = makeNote({ id: "note-2", updatedAt: "2026-06-18T00:00:00.000Z" });
    useNotesStore.setState({ notes: [newer, older] });

    useNotesStore.getState().patchLocal("note-1", {
      title: "Touched",
      updatedAt: "2026-06-19T00:00:00.000Z",
    });

    const notes = useNotesStore.getState().notes;
    expect(notes[0].id).toBe("note-1");
    expect(notes[0].title).toBe("Touched");
  });

  it("removeLocal deletes the note and clears selection if it was selected", () => {
    const note = makeNote();
    useNotesStore.setState({ notes: [note], selectedId: note.id });

    useNotesStore.getState().removeLocal(note.id);

    expect(useNotesStore.getState().notes).toHaveLength(0);
    expect(useNotesStore.getState().selectedId).toBeNull();
  });

  it("removeLocal leaves selection untouched when removing a different note", () => {
    const a = makeNote({ id: "note-1" });
    const b = makeNote({ id: "note-2" });
    useNotesStore.setState({ notes: [a, b], selectedId: "note-2" });

    useNotesStore.getState().removeLocal("note-1");

    expect(useNotesStore.getState().selectedId).toBe("note-2");
  });
});
