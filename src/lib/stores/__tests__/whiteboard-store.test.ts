import { describe, expect, it, beforeEach } from "vitest";

import { useWhiteboardStore, type WhiteboardDTO } from "@/lib/stores/whiteboard-store";

function makeBoard(overrides: Partial<WhiteboardDTO> = {}): WhiteboardDTO {
  return {
    id: "board-1",
    title: "Untitled board",
    elements: [],
    createdById: "user-1",
    updatedAt: "2026-06-18T00:00:00.000Z",
    ...overrides,
  };
}

describe("useWhiteboardStore", () => {
  beforeEach(() => {
    useWhiteboardStore.setState({ boards: [], selectedId: null });
  });

  it("upsertLocal adds a new board and updates an existing one", () => {
    const board = makeBoard();
    useWhiteboardStore.getState().upsertLocal(board);
    expect(useWhiteboardStore.getState().boards).toHaveLength(1);

    useWhiteboardStore.getState().upsertLocal({ ...board, title: "Renamed" });
    const boards = useWhiteboardStore.getState().boards;
    expect(boards).toHaveLength(1);
    expect(boards[0].title).toBe("Renamed");
  });

  it("patchLocal applies a partial update and re-sorts by updatedAt desc", () => {
    const older = makeBoard({ id: "board-1", updatedAt: "2026-06-17T00:00:00.000Z" });
    const newer = makeBoard({ id: "board-2", updatedAt: "2026-06-18T00:00:00.000Z" });
    useWhiteboardStore.setState({ boards: [newer, older] });

    useWhiteboardStore.getState().patchLocal("board-1", {
      title: "Touched",
      updatedAt: "2026-06-19T00:00:00.000Z",
    });

    const boards = useWhiteboardStore.getState().boards;
    expect(boards[0].id).toBe("board-1");
    expect(boards[0].title).toBe("Touched");
  });

  it("removeLocal deletes the board and clears selection if it was selected", () => {
    const board = makeBoard();
    useWhiteboardStore.setState({ boards: [board], selectedId: board.id });

    useWhiteboardStore.getState().removeLocal(board.id);

    expect(useWhiteboardStore.getState().boards).toHaveLength(0);
    expect(useWhiteboardStore.getState().selectedId).toBeNull();
  });

  it("removeLocal leaves selection untouched when removing a different board", () => {
    const a = makeBoard({ id: "board-1" });
    const b = makeBoard({ id: "board-2" });
    useWhiteboardStore.setState({ boards: [a, b], selectedId: "board-2" });

    useWhiteboardStore.getState().removeLocal("board-1");

    expect(useWhiteboardStore.getState().selectedId).toBe("board-2");
  });
});
