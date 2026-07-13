import { create } from "zustand";

export type KanbanTask = {
  id: string;
  title: string;
  description: string | null;
  priority: "LOW" | "MEDIUM" | "HIGH";
  dueDate: string | null;
  labels: string[];
  assigneeId: string | null;
  columnId: string;
  position: number;
};

export type KanbanColumn = {
  id: string;
  name: string;
  color: string;
  position: number;
  tasks: KanbanTask[];
};

type KanbanState = {
  columns: KanbanColumn[];
  setColumns: (columns: KanbanColumn[]) => void;
  moveTaskLocal: (taskId: string, toColumnId: string, toIndex: number) => void;
  reorderColumnsLocal: (orderedColumnIds: string[]) => void;
};

// Holds the optimistic board state for whichever board is currently mounted.
// Drag handlers mutate this immediately; on a failed server action the
// caller restores the pre-drag snapshot via setColumns() (rollback).
export const useKanbanStore = create<KanbanState>((set, get) => ({
  columns: [],
  setColumns: (columns) => set({ columns }),
  moveTaskLocal: (taskId, toColumnId, toIndex) => {
    const columns = get().columns;
    let movedTask: KanbanTask | undefined;

    const withoutTask = columns.map((col) => {
      const idx = col.tasks.findIndex((t) => t.id === taskId);
      if (idx === -1) return col;
      movedTask = col.tasks[idx];
      return { ...col, tasks: col.tasks.filter((t) => t.id !== taskId) };
    });

    if (!movedTask) return;

    const updated = withoutTask.map((col) => {
      if (col.id !== toColumnId) return col;
      const newTasks = [...col.tasks];
      newTasks.splice(toIndex, 0, { ...movedTask!, columnId: toColumnId });
      return { ...col, tasks: newTasks };
    });

    set({ columns: updated });
  },
  reorderColumnsLocal: (orderedColumnIds) => {
    const columns = get().columns;
    const byId = new Map(columns.map((c) => [c.id, c]));
    const reordered = orderedColumnIds
      .map((id) => byId.get(id))
      .filter((c): c is KanbanColumn => Boolean(c));
    set({ columns: reordered });
  },
}));
