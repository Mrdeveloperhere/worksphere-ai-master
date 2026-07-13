import { create } from "zustand";

import type { PageDTO } from "@/lib/pages/helpers";

export type { PageDTO };

type PagesState = {
  pages: PageDTO[];
  selectedId: string | null;
  setPages: (pages: PageDTO[]) => void;
  selectPage: (id: string | null) => void;
  upsertLocal: (page: PageDTO) => void;
  patchLocal: (id: string, patch: Partial<PageDTO>) => void;
  removeLocal: (id: string) => void;
};

// Mirrors the Notes store: list sorted by updatedAt desc on the server,
// patchLocal re-sorts after every edit so the most recently touched page
// stays pinned to the top.
export const usePagesStore = create<PagesState>((set, get) => ({
  pages: [],
  selectedId: null,
  setPages: (pages) => set({ pages }),
  selectPage: (id) => set({ selectedId: id }),
  upsertLocal: (page) => {
    const exists = get().pages.some((p) => p.id === page.id);
    set({
      pages: exists
        ? get().pages.map((p) => (p.id === page.id ? page : p))
        : [page, ...get().pages],
    });
  },
  patchLocal: (id, patch) => {
    const updated = get().pages.map((p) => (p.id === id ? { ...p, ...patch } : p));
    updated.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    set({ pages: updated });
  },
  removeLocal: (id) =>
    set({
      pages: get().pages.filter((p) => p.id !== id),
      selectedId: get().selectedId === id ? null : get().selectedId,
    }),
}));
