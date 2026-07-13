"use client";

import { useEffect } from "react";
import { toast } from "sonner";
import { PenTool } from "lucide-react";

import { WhiteboardList } from "@/components/whiteboard/whiteboard-list";
import { WhiteboardCanvas } from "@/components/whiteboard/whiteboard-canvas";
import { createWhiteboard } from "@/lib/whiteboard/actions";
import { useWhiteboardStore, type WhiteboardDTO } from "@/lib/stores/whiteboard-store";

export function WhiteboardView({
  workspaceId,
  initialBoards,
}: {
  workspaceId: string;
  initialBoards: WhiteboardDTO[];
}) {
  const boards = useWhiteboardStore((s) => s.boards);
  const selectedId = useWhiteboardStore((s) => s.selectedId);
  const setBoards = useWhiteboardStore((s) => s.setBoards);
  const selectBoard = useWhiteboardStore((s) => s.selectBoard);
  const upsertLocal = useWhiteboardStore((s) => s.upsertLocal);
  const patchLocal = useWhiteboardStore((s) => s.patchLocal);
  const removeLocal = useWhiteboardStore((s) => s.removeLocal);

  useEffect(() => {
    setBoards(initialBoards);
    if (initialBoards.length > 0) selectBoard(initialBoards[0].id);
    // Hydrate once on mount from the server-fetched list.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleCreate() {
    const result = await createWhiteboard(workspaceId);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    upsertLocal(result.data);
    selectBoard(result.data.id);
  }

  const selectedBoard = selectedId ? boards.find((b) => b.id === selectedId) ?? null : null;

  return (
    <div className="flex h-full">
      <WhiteboardList
        boards={boards}
        selectedId={selectedId}
        onSelect={selectBoard}
        onCreate={() => void handleCreate()}
      />

      {selectedBoard ? (
        <WhiteboardCanvas
          key={selectedBoard.id}
          board={selectedBoard}
          onUpdated={patchLocal}
          onDeleted={removeLocal}
        />
      ) : (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 text-center text-muted-foreground">
          <PenTool className="size-8" />
          <p className="text-sm">Select a board or create a new one.</p>
        </div>
      )}
    </div>
  );
}
