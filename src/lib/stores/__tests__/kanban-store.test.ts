import { describe, expect, it, beforeEach } from "vitest";

import { useKanbanStore, type KanbanColumn } from "@/lib/stores/kanban-store";

function makeColumns(): KanbanColumn[] {
  return [
    {
      id: "col-a",
      name: "To Do",
      color: "#94a3b8",
      position: 0,
      tasks: [
        {
          id: "task-1",
          title: "Write spec",
          description: null,
          priority: "MEDIUM",
          dueDate: null,
          labels: [],
          assigneeId: null,
          columnId: "col-a",
          position: 0,
        },
      ],
    },
    {
      id: "col-b",
      name: "In Progress",
      color: "#94a3b8",
      position: 1,
      tasks: [],
    },
  ];
}

// Regression-critical: this is the optimistic-update half of the
// optimistic-move-with-rollback-on-failure pattern decided in the eng
// review. The component layer calls moveTaskLocal() for the instant UI
// update, then setColumns(snapshot) to roll back if the server rejects it —
// both depend on this store behaving correctly.
describe("useKanbanStore", () => {
  beforeEach(() => {
    useKanbanStore.setState({ columns: [] });
  });

  it("moves a task into a different column at the given index", () => {
    useKanbanStore.setState({ columns: makeColumns() });

    useKanbanStore.getState().moveTaskLocal("task-1", "col-b", 0);

    const { columns } = useKanbanStore.getState();
    expect(columns.find((c) => c.id === "col-a")!.tasks).toHaveLength(0);
    expect(columns.find((c) => c.id === "col-b")!.tasks).toHaveLength(1);
    expect(columns.find((c) => c.id === "col-b")!.tasks[0].columnId).toBe("col-b");
  });

  it("supports rollback by restoring a snapshot taken before the move", () => {
    const snapshot = makeColumns();
    useKanbanStore.setState({ columns: snapshot });

    useKanbanStore.getState().moveTaskLocal("task-1", "col-b", 0);
    expect(useKanbanStore.getState().columns.find((c) => c.id === "col-a")!.tasks).toHaveLength(0);

    // Simulates the rollback the board component performs when the server
    // action returns success:false.
    useKanbanStore.getState().setColumns(snapshot);

    const restored = useKanbanStore.getState().columns;
    expect(restored.find((c) => c.id === "col-a")!.tasks).toHaveLength(1);
    expect(restored.find((c) => c.id === "col-b")!.tasks).toHaveLength(0);
  });

  it("reorders columns while preserving each column's tasks", () => {
    useKanbanStore.setState({ columns: makeColumns() });

    useKanbanStore.getState().reorderColumnsLocal(["col-b", "col-a"]);

    const { columns } = useKanbanStore.getState();
    expect(columns.map((c) => c.id)).toEqual(["col-b", "col-a"]);
    expect(columns.find((c) => c.id === "col-a")!.tasks).toHaveLength(1);
  });
});
