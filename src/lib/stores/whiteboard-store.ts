import { create } from "zustand";

import type { WhiteboardDTO } from "@/lib/whiteboard/helpers";

export type { WhiteboardDTO };

type WhiteboardState = {
  boards: WhiteboardDTO[];
  selectedId: string | null;
  setBoards: (boards: WhiteboardDTO[]) => void;
  selectBoard: (id: string | null) => void;
  upsertLocal: (board: WhiteboardDTO) => void;
  patchLocal: (id: string, patch: Partial<WhiteboardDTO>) => void;
  removeLocal: (id: string) => void;
};

// Mirrors the Notes/Pages stores: list sorted by updatedAt desc on the
// server, patchLocal re-sorts after every edit so the most recently touched
// board stays pinned to the top.
export const useWhiteboardStore = create<WhiteboardState>((set, get) => ({
  boards: [],
  selectedId: null,
  setBoards: (boards) => set({ boards }),
  selectBoard: (id) => set({ selectedId: id }),
  upsertLocal: (board) => {
    const exists = get().boards.some((b) => b.id === board.id);
    set({
      boards: exists
        ? get().boards.map((b) => (b.id === board.id ? board : b))
        : [board, ...get().boards],
    });
  },
  patchLocal: (id, patch) => {
    const updated = get().boards.map((b) => (b.id === id ? { ...b, ...patch } : b));
    updated.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    set({ boards: updated });
  },
  removeLocal: (id) =>
    set({
      boards: get().boards.filter((b) => b.id !== id),
      selectedId: get().selectedId === id ? null : get().selectedId,
    }),
}));
